from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from google.cloud import firestore

from . import auth
from .models import InviteCreateRequest, InviteResponse, MeResponse
from .settings import load_settings
from .store import IdentityStore, normalize_email


settings = load_settings()

app = FastAPI(title="Dativerso Identity API", version="0.1.0")

fs = firestore.Client(project=settings.firestore_project_id)
store = IdentityStore(fs)


@app.get("/healthz")
def healthz():
    return {"ok": True}


def get_current_context(request: Request) -> MeResponse:
    token = auth.get_bearer_token(request)
    claims = auth.get_claims(settings, token)
    sub = auth.require_str_claim(claims, "sub")
    email = auth.require_str_claim(claims, "email")

    m = store.get_membership(sub)
    if m is None:
        # First-login auto-accept: if there is a pending invite for this email, accept it.
        inv = store.find_pending_invite_for_email(email)
        if inv is None:
            raise HTTPException(status_code=403, detail="no membership (invite required)")
        m = store.accept_invite_and_create_membership(invite=inv, sub=sub, email=email)

    if not m.tenant_id or not m.role:
        raise HTTPException(status_code=403, detail="membership invalid")

    return MeResponse(sub=sub, email=normalize_email(email), tenant_id=m.tenant_id, role=m.role)


def require_admin(ctx: MeResponse = Depends(get_current_context)) -> MeResponse:
    if ctx.role != "admin":
        raise HTTPException(status_code=403, detail="admin role required")
    return ctx


@app.get("/v1/me", response_model=MeResponse)
def me(ctx: MeResponse = Depends(get_current_context)):
    return ctx


@app.post("/v1/invites", response_model=InviteResponse)
def create_invite(payload: InviteCreateRequest, ctx: MeResponse = Depends(require_admin)):
    if not store.tenant_exists(ctx.tenant_id):
        raise HTTPException(status_code=403, detail="tenant not found")

    inv = store.create_invite(
        tenant_id=ctx.tenant_id,
        email=payload.email,
        role=payload.role,
        created_by=ctx.sub,
        ttl_days=7,
    )
    login_url = f"{settings.frontend_base_url}/login"
    return InviteResponse(
        invite_id=inv.invite_id,
        tenant_id=inv.tenant_id,
        email=inv.email,
        role=inv.role,
        status=inv.status,
        created_by=inv.created_by,
        created_at=inv.created_at,
        expires_at=inv.expires_at,
        accepted_at=inv.accepted_at,
        revoked_at=inv.revoked_at,
        login_url=login_url,
    )


@app.get("/v1/invites", response_model=list[InviteResponse])
def list_invites(status: str | None = None, ctx: MeResponse = Depends(require_admin)):
    if status and status not in ("pending", "accepted", "revoked", "expired"):
        raise HTTPException(status_code=422, detail="invalid status filter")
    invites = store.list_invites(tenant_id=ctx.tenant_id, status=status, limit=100)
    login_url = f"{settings.frontend_base_url}/login"
    return [
        InviteResponse(
            invite_id=i.invite_id,
            tenant_id=i.tenant_id,
            email=i.email,
            role=i.role,
            status=i.status,
            created_by=i.created_by,
            created_at=i.created_at,
            expires_at=i.expires_at,
            accepted_at=i.accepted_at,
            revoked_at=i.revoked_at,
            login_url=login_url,
        )
        for i in invites
    ]


@app.post("/v1/invites/{invite_id}:revoke", response_model=InviteResponse)
def revoke_invite(invite_id: str, ctx: MeResponse = Depends(require_admin)):
    inv = store.revoke_invite(invite_id=invite_id, revoked_by=ctx.sub)
    if inv is None:
        return JSONResponse(status_code=404, content={"error": "not_found"})
    login_url = f"{settings.frontend_base_url}/login"
    return InviteResponse(
        invite_id=inv.invite_id,
        tenant_id=inv.tenant_id,
        email=inv.email,
        role=inv.role,
        status=inv.status,
        created_by=inv.created_by,
        created_at=inv.created_at,
        expires_at=inv.expires_at,
        accepted_at=inv.accepted_at,
        revoked_at=inv.revoked_at,
        login_url=login_url,
    )
