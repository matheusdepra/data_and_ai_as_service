from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from google.cloud import firestore


class FirestoreReadModel:
    def __init__(self, *, client: firestore.Client):
        self._db = client

    def _ingestion_ref(self, tenant_id: str, ingestion_id: str):
        return self._db.collection("tenants").document(tenant_id).collection("ingestions").document(ingestion_id)

    def update_status(
        self,
        *,
        tenant_id: str,
        ingestion_id: str,
        status: str,
        stage: str,
        message: str,
        collection_slug: str | None = None,
        artifact: dict[str, Any] | None = None,
        error: dict[str, Any] | None = None,
        timestamp_field: str | None = None,
    ) -> None:
        ref = self._ingestion_ref(tenant_id, ingestion_id)
        now = firestore.SERVER_TIMESTAMP
        payload: dict[str, Any] = {
            "tenant_id": tenant_id,
            "ingestion_id": ingestion_id,
            "status": status,
            "stage": stage,
            "updated_at": now,
        }
        if collection_slug:
            payload["collection_slug"] = collection_slug
            payload["dataset"] = collection_slug
        if timestamp_field:
            payload[timestamp_field] = now
        if artifact:
            payload["artifacts_summary"] = {artifact["layer"]: artifact.get("uri") or artifact.get("bq_table")}
        if error:
            payload["last_error"] = error
        elif status.endswith("_ready") or status in {"landed", "bronze_running", "silver_running"}:
            payload["last_error"] = None

        event_ref = ref.collection("events").document(f"{datetime.now(timezone.utc).isoformat()}-{uuid4()}")
        batch = self._db.batch()
        batch.set(ref, payload, merge=True)
        event: dict[str, Any] = {
            "stage": stage,
            "status": status,
            "message": message,
            "created_at": now,
        }
        if artifact:
            event["artifact"] = artifact
        if error:
            event["error"] = error
        batch.set(event_ref, event)
        batch.commit()

    def update_technical_summary(
        self,
        *,
        tenant_id: str,
        ingestion_id: str,
        technical_summary: dict[str, Any],
    ) -> None:
        self._ingestion_ref(tenant_id, ingestion_id).set(
            {
                "technical_summary": technical_summary,
                "updated_at": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )

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
