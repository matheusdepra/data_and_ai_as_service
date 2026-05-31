from __future__ import annotations

import json

from app.domain.models.chat import ChatRequestContext, UserContext
from app.domain.models.context import RetrievedContext


class BigQueryContextRetriever:
    """Explicit context injection prepared for BigQuery-backed metadata.

    The first implementation is intentionally metadata-oriented and does not run
    arbitrary user SQL. Future versions can use a BigQueryRepository to retrieve
    table schemas, certified metrics, previews, and governance metadata.
    """

    async def retrieve(self, *, user: UserContext, request_context: ChatRequestContext) -> RetrievedContext:
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
