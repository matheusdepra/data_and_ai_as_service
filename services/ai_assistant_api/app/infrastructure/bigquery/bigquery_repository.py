from __future__ import annotations

import asyncio
from typing import Any

from app.core.config import Settings
from app.domain.models.chat import UserContext


class GoogleBigQueryRepository:
    """BigQuery adapter skeleton behind the domain port.

    TODO: Add production query allow-listing, parameterized semantic views,
    max-bytes governance per tenant, OpenTelemetry spans, and retry policies.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def execute_query(
        self,
        *,
        sql: str,
        user: UserContext,
        parameters: dict[str, Any] | None = None,
        max_results: int = 100,
    ) -> list[dict[str, Any]]:
        return await asyncio.to_thread(
            self._execute_query_sync,
            sql=sql,
            user=user,
            parameters=parameters or {},
            max_results=max_results,
        )

    def _execute_query_sync(
        self,
        *,
        sql: str,
        user: UserContext,
        parameters: dict[str, Any],
        max_results: int,
    ) -> list[dict[str, Any]]:
        from google.cloud import bigquery

        if not self._settings.gcp_project_id:
            raise ValueError("CHAT_GCP_PROJECT_ID is required for BigQuery")

        client = bigquery.Client(project=self._settings.gcp_project_id)
        query_parameters = [
            bigquery.ScalarQueryParameter(name, self._infer_bq_type(value), value)
            for name, value in parameters.items()
        ]
        labels = {"tenant_id": self._sanitize_label(user.tenant_id), "service": "data-ai-chat"}
        job_config = bigquery.QueryJobConfig(
            labels=labels,
            query_parameters=query_parameters,
            maximum_bytes_billed=self._settings.bigquery_max_bytes_billed,
        )
        query_job = client.query(sql, job_config=job_config)
        rows = query_job.result(max_results=max_results)
        return [dict(row.items()) for row in rows]

    def _infer_bq_type(self, value: Any) -> str:
        if isinstance(value, bool):
            return "BOOL"
        if isinstance(value, int):
            return "INT64"
        if isinstance(value, float):
            return "FLOAT64"
        return "STRING"

    def _sanitize_label(self, value: str) -> str:
        sanitized = "".join(char.lower() if char.isalnum() or char in "_-" else "_" for char in value)
        return sanitized[:63] or "unknown"
