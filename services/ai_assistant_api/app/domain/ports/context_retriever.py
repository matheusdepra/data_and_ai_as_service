from __future__ import annotations

from collections.abc import Mapping
from typing import Protocol

from app.domain.models.chat import ChatRequestContext, ChatScope, UserContext
from app.domain.models.context import RetrievedContext


class ContextRetriever(Protocol):
    async def retrieve(
        self,
        *,
        user: UserContext,
        request_context: ChatRequestContext,
        request_scope: ChatScope,
        request_headers: Mapping[str, str],
    ) -> RetrievedContext:
        """Retrieve explicit contextual data for prompt injection."""
