from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from google.cloud import firestore


def _ts_to_iso(value: Any) -> str | None:
    if value is None:
        return None
    if hasattr(value, "to_datetime"):
        value = value.to_datetime()
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat()
    return str(value)


class FirestoreReadModel:
    def __init__(self, *, client: firestore.Client):
        self._db = client

    def _tenant_ref(self, tenant_id: str):
        return self._db.collection("tenants").document(tenant_id)

    def _ingestion_ref(self, tenant_id: str, ingestion_id: str):
        return self._tenant_ref(tenant_id).collection("ingestions").document(ingestion_id)

    def _overview_ref(self, tenant_id: str, ingestion_id: str):
        return self._ingestion_ref(tenant_id, ingestion_id).collection("derived").document("overview")

    def get_ingestion(self, *, tenant_id: str, ingestion_id: str) -> dict[str, Any] | None:
        snap = self._ingestion_ref(tenant_id, ingestion_id).get()
        if not snap.exists:
            return None
        return _serialize_doc(snap.to_dict() or {})

    def list_related_ingestions(self, *, tenant_id: str, limit: int = 24) -> list[dict[str, Any]]:
        snaps = (
            self._tenant_ref(tenant_id)
            .collection("ingestions")
            .order_by("updated_at", direction=firestore.Query.DESCENDING)
            .limit(limit)
            .stream()
        )
        return [_serialize_doc(snap.to_dict() or {}) for snap in snaps]

    def update_overview_status(
        self,
        *,
        tenant_id: str,
        ingestion_id: str,
        status: str,
        message: str,
        error: dict[str, Any] | None = None,
        started: bool = False,
        finished: bool = False,
    ) -> None:
        ref = self._ingestion_ref(tenant_id, ingestion_id)
        now = firestore.SERVER_TIMESTAMP
        payload: dict[str, Any] = {
            "overview_status": status,
            "updated_at": now,
        }
        if started:
            payload["overview_started_at"] = now
            payload["overview_ready_at"] = None
        if finished:
            payload["overview_ready_at"] = now
        if error:
            payload["overview_error"] = error
        elif status in {"pending", "running", "ready"}:
            payload["overview_error"] = None

        event_ref = ref.collection("events").document(f"{datetime.now(timezone.utc).isoformat()}-{uuid4()}")
        batch = self._db.batch()
        batch.set(ref, payload, merge=True)
        batch.set(
            event_ref,
            {
                "stage": "overview",
                "status": status,
                "message": message,
                "error": error,
                "created_at": now,
            },
        )
        batch.commit()

    def store_overview_payload(
        self,
        *,
        tenant_id: str,
        ingestion_id: str,
        payload: dict[str, Any],
    ) -> None:
        self._overview_ref(tenant_id, ingestion_id).set(payload, merge=True)


def _serialize_doc(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _serialize_doc(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_serialize_doc(v) for v in value]
    if isinstance(value, datetime) or hasattr(value, "to_datetime"):
        return _ts_to_iso(value)
    return value
