from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from google.cloud import bigquery

from .models import Artifact, IngestionDetail, IngestionError

@dataclass(frozen=True)
class IngestionRecord:
    tenant_id: str
    ingestion_id: str
    status: str
    source: str
    dataset: str
    landed_gcs_uri: str
    original_filename: str
    content_type: str | None
    size_bytes: int | None
    checksum_sha256: str | None


class MetadataStore:
    def __init__(self, *, bq_client: bigquery.Client, dataset_id: str):
        self._bq = bq_client
        self._dataset_id = dataset_id

    def upsert_landed(self, rec: IngestionRecord) -> None:
        # Merge is safer than insert-only for retries.
        now = datetime.now(timezone.utc).isoformat()
        table = f"`{self._bq.project}.{self._dataset_id}.ingestions`"
        query = f"""
MERGE {table} T
USING (
  SELECT
    @tenant_id AS tenant_id,
    @ingestion_id AS ingestion_id,
    @status AS status,
    @source AS source,
    @dataset AS dataset,
    @landed_gcs_uri AS landed_gcs_uri,
    @original_filename AS original_filename,
    @content_type AS content_type,
    @size_bytes AS size_bytes,
    @checksum_sha256 AS checksum_sha256,
    TIMESTAMP(@now) AS updated_at,
    TIMESTAMP(@now) AS received_at,
    TIMESTAMP(@now) AS landed_at
) S
ON T.tenant_id = S.tenant_id AND T.ingestion_id = S.ingestion_id
WHEN MATCHED THEN UPDATE SET
  status = S.status,
  source = S.source,
  dataset = S.dataset,
  landed_gcs_uri = S.landed_gcs_uri,
  original_filename = S.original_filename,
  content_type = S.content_type,
  size_bytes = S.size_bytes,
  checksum_sha256 = S.checksum_sha256,
  updated_at = S.updated_at,
  landed_at = S.landed_at
WHEN NOT MATCHED THEN INSERT (
  tenant_id, ingestion_id, status, source, dataset,
  landed_gcs_uri, original_filename, content_type, size_bytes, checksum_sha256,
  received_at, landed_at, updated_at
) VALUES (
  S.tenant_id, S.ingestion_id, S.status, S.source, S.dataset,
  S.landed_gcs_uri, S.original_filename, S.content_type, S.size_bytes, S.checksum_sha256,
  S.received_at, S.landed_at, S.updated_at
)
"""

        job = self._bq.query(
            query,
            job_config=bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("tenant_id", "STRING", rec.tenant_id),
                    bigquery.ScalarQueryParameter("ingestion_id", "STRING", rec.ingestion_id),
                    bigquery.ScalarQueryParameter("status", "STRING", rec.status),
                    bigquery.ScalarQueryParameter("source", "STRING", rec.source),
                    bigquery.ScalarQueryParameter("dataset", "STRING", rec.dataset),
                    bigquery.ScalarQueryParameter("landed_gcs_uri", "STRING", rec.landed_gcs_uri),
                    bigquery.ScalarQueryParameter("original_filename", "STRING", rec.original_filename),
                    bigquery.ScalarQueryParameter("content_type", "STRING", rec.content_type),
                    bigquery.ScalarQueryParameter("size_bytes", "INT64", rec.size_bytes),
                    bigquery.ScalarQueryParameter("checksum_sha256", "STRING", rec.checksum_sha256),
                    bigquery.ScalarQueryParameter("now", "STRING", now),
                ]
            ),
        )
        job.result()

    def insert_artifact(self, *, tenant_id: str, ingestion_id: str, layer: str, artifact_id: str, gcs_uri: str) -> None:
        table = f"{self._bq.project}.{self._dataset_id}.artifacts"
        rows: list[dict[str, Any]] = [
            {
                "tenant_id": tenant_id,
                "ingestion_id": ingestion_id,
                "layer": layer,
                "artifact_id": artifact_id,
                "gcs_uri": gcs_uri,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        ]
        errors = self._bq.insert_rows_json(table, rows)
        if errors:
            raise RuntimeError(f"failed to insert artifact: {errors}")

    def get_ingestion_detail(self, *, tenant_id: str, ingestion_id: str) -> IngestionDetail | None:
        # Keep the API response stable. Use ISO strings for timestamps.
        base = f"`{self._bq.project}.{self._dataset_id}`"

        ingestion_q = f"""
SELECT
  tenant_id,
  ingestion_id,
  status,
  source,
  dataset,
  landed_gcs_uri,
  original_filename,
  content_type,
  size_bytes,
  CAST(received_at AS STRING) AS received_at,
  CAST(landed_at AS STRING) AS landed_at,
  CAST(bronze_started_at AS STRING) AS bronze_started_at,
  CAST(bronze_ready_at AS STRING) AS bronze_ready_at,
  CAST(silver_started_at AS STRING) AS silver_started_at,
  CAST(silver_ready_at AS STRING) AS silver_ready_at,
  CAST(updated_at AS STRING) AS updated_at
FROM {base}.ingestions
WHERE tenant_id = @tenant_id AND ingestion_id = @ingestion_id
LIMIT 1
"""

        params = [
            bigquery.ScalarQueryParameter("tenant_id", "STRING", tenant_id),
            bigquery.ScalarQueryParameter("ingestion_id", "STRING", ingestion_id),
        ]
        rows = list(self._bq.query(ingestion_q, job_config=bigquery.QueryJobConfig(query_parameters=params)).result())
        if not rows:
            return None

        ingestion = dict(rows[0].items())

        artifacts_q = f"""
SELECT
  layer,
  artifact_id,
  gcs_uri,
  bq_table,
  CAST(created_at AS STRING) AS created_at
FROM {base}.artifacts
WHERE tenant_id = @tenant_id AND ingestion_id = @ingestion_id
ORDER BY created_at ASC
LIMIT 200
"""
        artifacts_rows = self._bq.query(artifacts_q, job_config=bigquery.QueryJobConfig(query_parameters=params)).result()
        artifacts: list[Artifact] = [dict(r.items()) for r in artifacts_rows]

        errors_q = f"""
SELECT
  stage,
  reason_code,
  message,
  details_json,
  CAST(created_at AS STRING) AS created_at
FROM {base}.ingestion_errors
WHERE tenant_id = @tenant_id AND ingestion_id = @ingestion_id
ORDER BY created_at ASC
LIMIT 200
"""
        errors_rows = self._bq.query(errors_q, job_config=bigquery.QueryJobConfig(query_parameters=params)).result()
        errors: list[IngestionError] = [dict(r.items()) for r in errors_rows]

        return {"ingestion": ingestion, "artifacts": artifacts, "errors": errors}

    def delete_ingestion_records(self, *, tenant_id: str, ingestion_id: str) -> None:
        base = f"`{self._bq.project}.{self._dataset_id}`"
        params = [
            bigquery.ScalarQueryParameter("tenant_id", "STRING", tenant_id),
            bigquery.ScalarQueryParameter("ingestion_id", "STRING", ingestion_id),
        ]
        for table_name in ("artifacts", "ingestion_errors", "ingestions"):
            query = f"""
DELETE FROM {base}.{table_name}
WHERE tenant_id = @tenant_id AND ingestion_id = @ingestion_id
"""
            self._bq.query(query, job_config=bigquery.QueryJobConfig(query_parameters=params)).result()

    def find_ingestion_tenant(self, *, ingestion_id: str) -> str | None:
        base = f"`{self._bq.project}.{self._dataset_id}`"
        query = f"""
SELECT tenant_id
FROM {base}.ingestions
WHERE ingestion_id = @ingestion_id
ORDER BY updated_at DESC
LIMIT 1
"""
        params = [bigquery.ScalarQueryParameter("ingestion_id", "STRING", ingestion_id)]
        rows = list(self._bq.query(query, job_config=bigquery.QueryJobConfig(query_parameters=params)).result())
        if not rows:
            return None
        tenant_id = rows[0].get("tenant_id")
        return str(tenant_id) if tenant_id else None
