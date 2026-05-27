from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class GcsFinalizeEvent:
    bucket: str
    name: str
    generation: str | None


def parse_cloudevent(payload: dict[str, Any], headers: dict[str, str]) -> tuple[str | None, dict[str, Any]]:
    # Supports structured mode (payload includes type/data) and binary mode (ce-type header).
    ce_type = payload.get("type") or headers.get("ce-type") or headers.get("Ce-Type")
    data = payload.get("data")
    if data is None and isinstance(payload.get("bucket"), str) and isinstance(payload.get("name"), str):
        # Binary mode: body is the event data payload.
        data = payload
    if data is None and isinstance(payload.get("data_base64"), str):
        # Not expected for storage finalize; left for future Pub/Sub support.
        data = {}
    if not isinstance(data, dict):
        data = {}
    return ce_type, data


def parse_storage_finalize(data: dict[str, Any], payload: dict[str, Any]) -> GcsFinalizeEvent:
    # Eventarc storage finalize typically provides bucket/name/generation in data.
    # Some examples use subject="objects/..." so we fallback to payload subject parsing.
    bucket = data.get("bucket") or ""
    name = data.get("name") or ""
    generation = data.get("generation")

    if not name:
        subject = payload.get("subject") or ""
        if isinstance(subject, str) and subject.startswith("objects/"):
            name = subject[len("objects/") :]

    if not isinstance(bucket, str) or not bucket:
        raise ValueError("missing bucket")
    if not isinstance(name, str) or not name:
        raise ValueError("missing object name")
    if generation is not None and not isinstance(generation, str):
        generation = str(generation)

    return GcsFinalizeEvent(bucket=bucket, name=name, generation=generation)


def parse_ingestion_from_object_name(object_name: str) -> tuple[str | None, str | None]:
    # Expected landing path:
    # landing/tenant_id=.../source=.../dataset=.../ingestion_date=.../{ingestion_id}/{filename}
    parts = object_name.split("/")
    tenant_id = None
    ingestion_id = None
    for p in parts:
        if p.startswith("tenant_id="):
            tenant_id = p.split("=", 1)[1] or None
    # ingestion_id should be the directory after ingestion_date=...
    for i, p in enumerate(parts):
        if p.startswith("ingestion_date=") and i + 1 < len(parts):
            ingestion_id = parts[i + 1] or None
            break
    return tenant_id, ingestion_id
