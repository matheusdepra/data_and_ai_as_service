from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
import uuid

from google.cloud import firestore


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_email(email: str) -> str:
    return email.strip().lower()


@dataclass(frozen=True)
class Membership:
    tenant_id: str
    sub: str
    email: str
    role: str
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True)
class Invite:
    invite_id: str
    tenant_id: str
    email: str
    role: str
    status: str
    created_by: str
    created_at: datetime
    expires_at: datetime
    accepted_at: datetime | None
    revoked_at: datetime | None


class IdentityStore:
    def __init__(self, client: firestore.Client):
        self.db = client

    # ---- Tenants ----
    def tenant_exists(self, tenant_id: str) -> bool:
        doc = self.db.collection("tenants").document(tenant_id).get()
        return doc.exists

    # ---- Memberships ----
    def get_membership(self, sub: str) -> Membership | None:
        doc = self.db.collection("memberships").document(sub).get()
        if not doc.exists:
            return None
        d = doc.to_dict() or {}
        return Membership(
            tenant_id=str(d.get("tenant_id") or ""),
            sub=str(d.get("sub") or sub),
            email=str(d.get("email") or ""),
            role=str(d.get("role") or ""),
            created_at=d.get("created_at") or utc_now(),
            updated_at=d.get("updated_at") or utc_now(),
        )

    def upsert_membership(self, *, tenant_id: str, sub: str, email: str, role: str) -> Membership:
        now = utc_now()
        ref = self.db.collection("memberships").document(sub)
        # create_or_update: keep created_at if present
        existing = ref.get()
        created_at = (existing.to_dict() or {}).get("created_at") if existing.exists else None
        payload: dict[str, Any] = {
            "tenant_id": tenant_id,
            "sub": sub,
            "email": normalize_email(email),
            "role": role,
            "updated_at": now,
        }
        if not created_at:
            payload["created_at"] = now
        ref.set(payload, merge=True)
        return Membership(
            tenant_id=tenant_id,
            sub=sub,
            email=normalize_email(email),
            role=role,
            created_at=created_at or now,
            updated_at=now,
        )

    # ---- Invites ----
    def create_invite(
        self, *, tenant_id: str, email: str, role: str, created_by: str, ttl_days: int = 7
    ) -> Invite:
        now = utc_now()
        invite_id = str(uuid.uuid4())
        expires_at = now + timedelta(days=ttl_days)
        email_norm = normalize_email(email)
        payload: dict[str, Any] = {
            "invite_id": invite_id,
            "tenant_id": tenant_id,
            "email": email_norm,
            "role": role,
            "status": "pending",
            "created_by": created_by,
            "created_at": now,
            "expires_at": expires_at,
            "accepted_at": None,
            "revoked_at": None,
        }
        self.db.collection("invites").document(invite_id).set(payload)
        # Index by email to avoid composite indexes for lookup.
        self.db.collection("invite_index_by_email").document(email_norm).set(
            {"invite_id": invite_id, "tenant_id": tenant_id, "role": role, "expires_at": expires_at},
            merge=True,
        )
        return Invite(**payload)  # type: ignore[arg-type]

    def list_invites(self, *, tenant_id: str, status: str | None = None, limit: int = 100) -> list[Invite]:
        # Avoid composite indexes in Firestore by querying only by tenant_id and filtering in memory.
        q = self.db.collection("invites").where("tenant_id", "==", tenant_id).limit(limit)
        out: list[Invite] = []
        for doc in q.stream():
            d = doc.to_dict() or {}
            if status and str(d.get("status") or "") != status:
                continue
            out.append(
                Invite(
                    invite_id=str(d.get("invite_id") or doc.id),
                    tenant_id=str(d.get("tenant_id") or ""),
                    email=str(d.get("email") or ""),
                    role=str(d.get("role") or ""),
                    status=str(d.get("status") or ""),
                    created_by=str(d.get("created_by") or ""),
                    created_at=d.get("created_at") or utc_now(),
                    expires_at=d.get("expires_at") or utc_now(),
                    accepted_at=d.get("accepted_at"),
                    revoked_at=d.get("revoked_at"),
                )
            )
        return out

    def get_invite(self, invite_id: str) -> Invite | None:
        doc = self.db.collection("invites").document(invite_id).get()
        if not doc.exists:
            return None
        d = doc.to_dict() or {}
        return Invite(
            invite_id=str(d.get("invite_id") or doc.id),
            tenant_id=str(d.get("tenant_id") or ""),
            email=str(d.get("email") or ""),
            role=str(d.get("role") or ""),
            status=str(d.get("status") or ""),
            created_by=str(d.get("created_by") or ""),
            created_at=d.get("created_at") or utc_now(),
            expires_at=d.get("expires_at") or utc_now(),
            accepted_at=d.get("accepted_at"),
            revoked_at=d.get("revoked_at"),
        )

    def revoke_invite(self, *, invite_id: str, revoked_by: str) -> Invite | None:
        ref = self.db.collection("invites").document(invite_id)
        doc = ref.get()
        if not doc.exists:
            return None
        d = doc.to_dict() or {}
        if str(d.get("status")) != "pending":
            return self.get_invite(invite_id)
        now = utc_now()
        email_norm = normalize_email(str(d.get("email") or ""))
        ref.set({"status": "revoked", "revoked_at": now, "revoked_by": revoked_by}, merge=True)
        # Best-effort: clear email index if it points to this invite.
        idx_ref = self.db.collection("invite_index_by_email").document(email_norm)
        idx_doc = idx_ref.get()
        if idx_doc.exists and (idx_doc.to_dict() or {}).get("invite_id") == invite_id:
            idx_ref.delete()
        return self.get_invite(invite_id)

    def find_pending_invite_for_email(self, email: str) -> Invite | None:
        email_norm = normalize_email(email)
        now = utc_now()
        idx = self.db.collection("invite_index_by_email").document(email_norm).get()
        if not idx.exists:
            return None
        d = idx.to_dict() or {}
        invite_id = str(d.get("invite_id") or "")
        expires_at = d.get("expires_at")
        if isinstance(expires_at, datetime) and expires_at < now:
            # Expired index; clear it.
            self.db.collection("invite_index_by_email").document(email_norm).delete()
            return None
        inv = self.get_invite(invite_id)
        if inv is None:
            return None
        if inv.status != "pending":
            self.db.collection("invite_index_by_email").document(email_norm).delete()
            return None
        if inv.expires_at < now:
            self.db.collection("invite_index_by_email").document(email_norm).delete()
            return None
        return inv

    def accept_invite_and_create_membership(self, *, invite: Invite, sub: str, email: str) -> Membership:
        now = utc_now()
        # Mark invite accepted first (best-effort, but we want idempotence)
        self.db.collection("invites").document(invite.invite_id).set(
            {"status": "accepted", "accepted_at": now, "accepted_by": sub},
            merge=True,
        )
        # Clear email index if it points to this invite.
        email_norm = normalize_email(invite.email)
        idx_ref = self.db.collection("invite_index_by_email").document(email_norm)
        idx_doc = idx_ref.get()
        if idx_doc.exists and (idx_doc.to_dict() or {}).get("invite_id") == invite.invite_id:
            idx_ref.delete()
        return self.upsert_membership(tenant_id=invite.tenant_id, sub=sub, email=email, role=invite.role)
