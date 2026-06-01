from __future__ import annotations

import asyncio
import json
from collections.abc import Mapping

from app.core.config import Settings, get_settings
from app.core.errors import NotFoundError, ProviderError
from app.domain.models.chat import ChatRequestContext, ChatScope, UserContext
from app.domain.models.context import RetrievedContext
from app.infrastructure.clients.ingestion_api_client import IngestionApiClient


class BigQueryContextRetriever:
    """Explicit context injection prepared for dataset-scoped retrieval.

    When an ingestion_id is provided, this retriever loads trusted overview data
    from ingestion-api. Otherwise it falls back to the original lightweight
    explicit-context behavior for generic chat experiments.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._ingestion_api = IngestionApiClient(self._settings)

    async def retrieve(
        self,
        *,
        user: UserContext,
        request_context: ChatRequestContext,
        request_scope: ChatScope,
        request_headers: Mapping[str, str],
    ) -> RetrievedContext:
        if request_scope.ingestion_id:
            return await self._retrieve_dataset_overview_context(
                user=user,
                request_context=request_context,
                request_scope=request_scope,
                request_headers=request_headers,
            )

        dataset = request_context.dataset or "unspecified"
        sources = [f"bigquery:{dataset}.{table}" for table in request_context.tables]
        content = {
            "tenant_id": user.tenant_id,
            "dataset": dataset,
            "tables": request_context.tables,
            "filters": request_context.filters,
            "notes": [
                "Context is explicitly provided by the API request and tenant-scoped auth context.",
                "No arbitrary BigQuery query is executed by this retriever yet.",
            ],
        }
        return RetrievedContext(
            content=json.dumps(content, ensure_ascii=False, indent=2),
            sources=sources,
            metadata={"retriever": "bigquery_context_skeleton"},
        )

    async def _retrieve_dataset_overview_context(
        self,
        *,
        user: UserContext,
        request_context: ChatRequestContext,
        request_scope: ChatScope,
        request_headers: Mapping[str, str],
    ) -> RetrievedContext:
        base_url = (self._settings.ingestion_api_base_url or "").rstrip("/")
        ingestion_id = request_scope.ingestion_id or ""
        if not base_url:
            raise ProviderError("CHAT_INGESTION_API_BASE_URL is required for dataset-scoped context retrieval")
        if not ingestion_id:
            raise NotFoundError("ingestion_id is required for dataset overview context")

        detail_path = f"/v1/ingestions/{ingestion_id}"
        overview_path = f"/v1/ingestions/{ingestion_id}/overview"
        semantic_path = f"/v1/ingestions/{ingestion_id}/overview/semantic"

        detail = await asyncio.to_thread(
            self._ingestion_api.get_json,
            path=detail_path,
            request_headers=request_headers,
            allow_not_found=False,
        )
        overview = await asyncio.to_thread(
            self._ingestion_api.get_json,
            path=overview_path,
            request_headers=request_headers,
            allow_not_found=True,
        )
        semantic = await asyncio.to_thread(
            self._ingestion_api.get_json,
            path=semantic_path,
            request_headers=request_headers,
            allow_not_found=True,
        )

        ingestion = detail.get("ingestion") if isinstance(detail, dict) else {}
        overview_payload = overview.get("overview") if isinstance(overview, dict) else {}
        semantic_payload = semantic.get("semantic") if isinstance(semantic, dict) else {}
        sources = [
            f"ingestion-api:{detail_path}",
            f"ingestion-api:{overview_path}",
        ]
        if semantic_payload:
            sources.append(f"ingestion-api:{semantic_path}")

        content = {
            "screen": request_scope.screen or "dataset_overview",
            "ingestion_id": ingestion_id,
            "tenant_id": user.tenant_id,
            "requested_dataset": request_context.dataset,
            "collection_slug": ingestion.get("collection_slug"),
            "stage": ingestion.get("stage") or ingestion.get("status"),
            "technical_summary": ingestion.get("technical_summary") or {},
            "overview_status": overview.get("status") if isinstance(overview, dict) else None,
            "dataset_header": (overview_payload or {}).get("dataset_header") or {},
            "ai_understanding": (overview_payload or {}).get("ai_understanding") or {},
            "summary": (overview_payload or {}).get("summary") or {},
            "quality": (overview_payload or {}).get("quality") or {},
            "business_description": (overview_payload or {}).get("business_description") or {},
            "terms": (overview_payload or {}).get("terms") or [],
            "relationships": (overview_payload or {}).get("relationships") or [],
            "schema": (overview_payload or {}).get("schema") or {},
            "preview_rows": (overview_payload or {}).get("preview_rows") or [],
            "semantic_overlay": semantic_payload or {},
        }

        return RetrievedContext(
            content=json.dumps(content, ensure_ascii=False, indent=2),
            sources=sources,
            metadata={"retriever": "ingestion_api_overview_context", "ingestion_id": ingestion_id},
        )
