from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from google.cloud import bigquery


class MetadataStore:
    def __init__(self, *, bq_client: bigquery.Client, dataset_id: str):
        self._bq = bq_client
        self._dataset_id = dataset_id

    def update_status(self, *, tenant_id: str, ingestion_id: str, status: str, timestamp_field: str | None = None) -> None:
        now = datetime.now(timezone.utc).isoformat()
        table = f"`{self._bq.project}.{self._dataset_id}.ingestions`"

        set_clause = "status = @status, updated_at = TIMESTAMP(@now)"
        if timestamp_field:
            set_clause = f"{set_clause}, {timestamp_field} = TIMESTAMP(@now)"

        query = f"""
UPDATE {table}
SET {set_clause}
WHERE tenant_id = @tenant_id AND ingestion_id = @ingestion_id
"""
        self._bq.query(
            query,
            job_config=bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("tenant_id", "STRING", tenant_id),
                    bigquery.ScalarQueryParameter("ingestion_id", "STRING", ingestion_id),
                    bigquery.ScalarQueryParameter("status", "STRING", status),
                    bigquery.ScalarQueryParameter("now", "STRING", now),
                ]
            ),
        ).result()

    def insert_artifact_bq(self, *, tenant_id: str, ingestion_id: str, layer: str, artifact_id: str, bq_table: str) -> None:
        table = f"{self._bq.project}.{self._dataset_id}.artifacts"
        rows: list[dict[str, Any]] = [
            {
                "tenant_id": tenant_id,
                "ingestion_id": ingestion_id,
                "layer": layer,
                "artifact_id": artifact_id,
                "bq_table": bq_table,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        ]
        errors = self._bq.insert_rows_json(table, rows)
        if errors:
            raise RuntimeError(f"failed to insert artifact: {errors}")

