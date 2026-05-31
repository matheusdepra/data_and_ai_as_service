from __future__ import annotations

from typing import Protocol

from app.domain.models.chat import ChatRequestContext, UserContext
from app.domain.models.context import RetrievedContext


class ContextRetriever(Protocol):
    async def retrieve(self, *, user: UserContext, request_context: ChatRequestContext) -> RetrievedContext:
        """Retrieve explicit contextual data for prompt injection."""
