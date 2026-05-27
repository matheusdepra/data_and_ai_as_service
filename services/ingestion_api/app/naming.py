from __future__ import annotations

import re
from datetime import datetime, timezone


_SAFE_SEGMENT_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{0,127}$")


def _slug(s: str, default: str) -> str:
    v = (s or "").strip().lower()
    if not v:
        return default
    v = re.sub(r"\s+", "_", v)
    v = re.sub(r"[^a-z0-9._-]", "_", v)
    v = re.sub(r"_+", "_", v).strip("_")
    if not v:
        return default
    if not _SAFE_SEGMENT_RE.match(v):
        return default
    return v


def normalize_source(source: str | None) -> str:
    return _slug(source or "", default="upload")


def normalize_dataset(dataset: str | None) -> str:
    return _slug(dataset or "", default="default")


def normalize_tenant_id(tenant_id: str) -> str:
    # tenant_id comes from a trusted token, but we still normalize to keep GCS paths consistent.
    return _slug(tenant_id, default="unknown")


def ingestion_date_utc() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def build_landing_object_name(
    *,
    tenant_id: str,
    source: str,
    dataset: str,
    ingestion_date: str,
    ingestion_id: str,
    original_filename: str,
) -> str:
    # Keep a stable, query-friendly structure. Avoid allowing arbitrary client-provided directories.
    safe_filename = original_filename.replace("/", "_").replace("\\", "_").strip() or "file"
    return (
        "landing/"
        f"tenant_id={tenant_id}/"
        f"source={source}/"
        f"dataset={dataset}/"
        f"ingestion_date={ingestion_date}/"
        f"{ingestion_id}/"
        f"{safe_filename}"
    )

