from __future__ import annotations

from app.domain.models.chat import ChatRequestContext, UserContext
from app.domain.models.context import RetrievedContext
from app.domain.ports.context_retriever import ContextRetriever


class ContextService:
    def __init__(self, context_retriever: ContextRetriever) -> None:
        self._context_retriever = context_retriever

    async def retrieve_context(self, *, user: UserContext, request_context: ChatRequestContext) -> RetrievedContext:
        return await self._context_retriever.retrieve(user=user, request_context=request_context)
