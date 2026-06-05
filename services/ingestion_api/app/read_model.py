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

    def _overview_semantic_ref(self, tenant_id: str, ingestion_id: str):
        return self._ingestion_ref(tenant_id, ingestion_id).collection("derived").document("overview_semantic")

    def upsert_collection_stub(self, *, tenant_id: str, slug: str, created_by: str | None = None) -> None:
        ref = self._tenant_ref(tenant_id).collection("collections").document(slug)
        snap = ref.get()
        payload: dict[str, Any] = {
            "slug": slug,
            "display_name": slug.replace("-", " ").title(),
            "description": "",
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
        if created_by:
            payload["created_by"] = created_by
        if not snap.exists:
            payload.update(
                {
                    "created_at": firestore.SERVER_TIMESTAMP,
                    "last_ingestion_at": None,
                    "ingestions_count": 0,
                }
            )
        ref.set(payload, merge=True)

    def record_landed_ingestion(
        self,
        *,
        tenant_id: str,
        ingestion_id: str,
        source: str,
        collection_slug: str,
        gcs_uri: str,
        file_name: str,
        content_type: str | None,
        size_bytes: int | None,
    ) -> None:
        now = firestore.SERVER_TIMESTAMP
        ingestion_ref = self._ingestion_ref(tenant_id, ingestion_id)
        collection_ref = self._tenant_ref(tenant_id).collection("collections").document(collection_slug)
        batch = self._db.batch()
        batch.set(
            ingestion_ref,
            {
                "tenant_id": tenant_id,
                "ingestion_id": ingestion_id,
                "status": "landed",
                "stage": "landing",
                "source": source,
                "dataset": collection_slug,
                "collection_slug": collection_slug,
                "file": {
                    "name": file_name,
                    "content_type": content_type,
                    "size_bytes": size_bytes,
                    "gcs_uri": gcs_uri,
                },
                "artifacts_summary": {"landing": gcs_uri},
                "last_error": None,
                "received_at": now,
                "landed_at": now,
                "updated_at": now,
            },
            merge=True,
        )
        batch.set(
            collection_ref,
            {
                "slug": collection_slug,
                "display_name": collection_slug.replace("-", " ").title(),
                "description": "",
                "last_ingestion_at": now,
                "updated_at": now,
                "ingestions_count": firestore.Increment(1),
            },
            merge=True,
        )
        event_ref = ingestion_ref.collection("events").document(f"{datetime.now(timezone.utc).isoformat()}-{uuid4()}")
        batch.set(
            event_ref,
            {
                "stage": "landing",
                "status": "landed",
                "message": "Arquivo recebido na landing zone.",
                "gcs_uri": gcs_uri,
                "created_at": now,
            },
        )
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

    def store_overview_payload(
        self,
        *,
        tenant_id: str,
        ingestion_id: str,
        payload: dict[str, Any],
    ) -> None:
        self._overview_ref(tenant_id, ingestion_id).set(payload, merge=True)

    def get_overview(self, *, tenant_id: str, ingestion_id: str) -> dict[str, Any] | None:
        ingestion = self.get_ingestion(tenant_id=tenant_id, ingestion_id=ingestion_id)
        if ingestion is None:
            return None
        overview_snap = self._overview_ref(tenant_id, ingestion_id).get()
        overview = _serialize_doc(overview_snap.to_dict() or {}) if overview_snap.exists else None
        return {
            "tenant_id": tenant_id,
            "ingestion_id": ingestion_id,
            "status": ingestion.get("overview_status") or "pending",
            "started_at": ingestion.get("overview_started_at"),
            "ready_at": ingestion.get("overview_ready_at"),
            "error": ingestion.get("overview_error"),
            "overview": overview,
        }

    def get_overview_semantic(self, *, tenant_id: str, ingestion_id: str) -> dict[str, Any] | None:
        ingestion = self.get_ingestion(tenant_id=tenant_id, ingestion_id=ingestion_id)
        if ingestion is None:
            return None
        semantic_snap = self._overview_semantic_ref(tenant_id, ingestion_id).get()
        semantic = _serialize_doc(semantic_snap.to_dict() or {}) if semantic_snap.exists else {}
        return {
            "tenant_id": tenant_id,
            "ingestion_id": ingestion_id,
            **semantic,
        }

    def store_overview_semantic(
        self,
        *,
        tenant_id: str,
        ingestion_id: str,
        base_version: str | None,
        reason: str,
        semantic: dict[str, Any],
        patch: dict[str, Any],
        updated_by: dict[str, Any],
    ) -> None:
        ref = self._overview_semantic_ref(tenant_id, ingestion_id)
        ingestion_ref = self._ingestion_ref(tenant_id, ingestion_id)
        now = firestore.SERVER_TIMESTAMP
        history_ref = ref.collection("history").document(f"{datetime.now(timezone.utc).isoformat()}-{uuid4()}")
        event_ref = ingestion_ref.collection("events").document(f"{datetime.now(timezone.utc).isoformat()}-{uuid4()}")

        payload = {
            "base_version": base_version,
            "updated_at": now,
            "updated_by": updated_by,
            "reason": reason,
            "semantic": semantic,
        }
        batch = self._db.batch()
        batch.set(ref, payload, merge=True)
        batch.set(
            history_ref,
            {
                "created_at": now,
                "created_by": updated_by,
                "reason": reason,
                "patch": patch,
                "base_version": base_version,
                "resolved_after_patch": semantic,
            },
        )
        batch.set(
            event_ref,
            {
                "stage": "overview_semantic",
                "status": "updated",
                "message": "Refinamento semântico do overview persistido.",
                "reason": reason,
                "patch": patch,
                "created_at": now,
            },
        )
        batch.set(
            ingestion_ref,
            {
                "updated_at": now,
            },
            merge=True,
        )
        batch.commit()

    def get_ingestion(self, *, tenant_id: str, ingestion_id: str) -> dict[str, Any] | None:
        ref = self._ingestion_ref(tenant_id, ingestion_id)
        snap = ref.get()
        if not snap.exists:
            return None
        data = snap.to_dict() or {}
        return _serialize_doc(data)

    def list_ingestions(
        self,
        *,
        tenant_id: str,
        limit: int,
        collection_slug: str | None = None,
        status: str | None = None,
    ) -> list[dict[str, Any]]:
        query = self._tenant_ref(tenant_id).collection("ingestions")
        if collection_slug:
            query = query.where(filter=firestore.FieldFilter("collection_slug", "==", collection_slug))
        if status:
            query = query.where(filter=firestore.FieldFilter("status", "==", status))
        query = query.order_by("updated_at", direction=firestore.Query.DESCENDING).limit(limit)
        return [_serialize_doc(snap.to_dict() or {}) for snap in query.stream()]

    def delete_ingestion(self, *, tenant_id: str, ingestion_id: str) -> dict[str, Any] | None:
        ingestion_ref = self._ingestion_ref(tenant_id, ingestion_id)
        snap = ingestion_ref.get()
        if not snap.exists:
            return None

        data = snap.to_dict() or {}
        collection_slug = str(data.get("collection_slug") or data.get("dataset") or "").strip() or None
        self._delete_doc_recursive(ingestion_ref)

        if collection_slug:
            self._refresh_collection_stats(tenant_id=tenant_id, collection_slug=collection_slug)

        return _serialize_doc(data)

    def _refresh_collection_stats(self, *, tenant_id: str, collection_slug: str) -> None:
        collection_ref = self._tenant_ref(tenant_id).collection("collections").document(collection_slug)
        query = (
            self._tenant_ref(tenant_id)
            .collection("ingestions")
            .where(filter=firestore.FieldFilter("collection_slug", "==", collection_slug))
            .order_by("updated_at", direction=firestore.Query.DESCENDING)
            .limit(1)
        )
        latest = next(query.stream(), None)
        total = sum(1 for _ in self._tenant_ref(tenant_id).collection("ingestions").where(filter=firestore.FieldFilter("collection_slug", "==", collection_slug)).stream())

        if total <= 0:
            collection_ref.set(
                {
                    "last_ingestion_at": None,
                    "updated_at": firestore.SERVER_TIMESTAMP,
                    "ingestions_count": 0,
                },
                merge=True,
            )
            return

        latest_data = latest.to_dict() if latest is not None else {}
        collection_ref.set(
            {
                "last_ingestion_at": latest_data.get("updated_at"),
                "updated_at": firestore.SERVER_TIMESTAMP,
                "ingestions_count": total,
            },
            merge=True,
        )

    def _delete_doc_recursive(self, doc_ref: firestore.DocumentReference) -> None:
        for subcollection in doc_ref.collections():
            docs = list(subcollection.stream())
            for child in docs:
                self._delete_doc_recursive(child.reference)
        doc_ref.delete()


def _serialize_doc(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _serialize_doc(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_serialize_doc(v) for v in value]
    if isinstance(value, datetime) or hasattr(value, "to_datetime"):
        return _ts_to_iso(value)
    return value
