from __future__ import annotations

from typing import Any, Literal, TypedDict


Layer = Literal["landing", "quarantine", "bronze", "silver", "gold"]


class Artifact(TypedDict, total=False):
    layer: Layer
    artifact_id: str
    gcs_uri: str | None
    bq_table: str | None
    created_at: str | None


class Ingestion(TypedDict, total=False):
    tenant_id: str
    ingestion_id: str
    status: str
    source: str | None
    dataset: str | None
    landed_gcs_uri: str | None
    original_filename: str | None
    content_type: str | None
    size_bytes: int | None
    received_at: str | None
    landed_at: str | None
    bronze_started_at: str | None
    bronze_ready_at: str | None
    silver_started_at: str | None
    silver_ready_at: str | None
    updated_at: str | None


class IngestionError(TypedDict, total=False):
    stage: str | None
    reason_code: str | None
    message: str | None
    details_json: str | None
    created_at: str | None


class IngestionDetail(TypedDict, total=False):
    ingestion: Ingestion
    artifacts: list[Artifact]
    errors: list[IngestionError]

