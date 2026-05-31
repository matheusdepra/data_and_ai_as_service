from __future__ import annotations

from typing import Any, Protocol

from app.domain.models.chat import UserContext


class BigQueryRepository(Protocol):
    async def execute_query(
        self,
        *,
        sql: str,
        user: UserContext,
        parameters: dict[str, Any] | None = None,
        max_results: int = 100,
    ) -> list[dict[str, Any]]:
        """Execute tenant-authorized SQL and return rows."""
