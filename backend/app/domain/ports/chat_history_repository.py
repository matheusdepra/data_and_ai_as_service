from __future__ import annotations

from typing import Protocol

from app.domain.models.chat import ChatMessage, UserContext


class ChatHistoryRepository(Protocol):
    async def list_messages(self, *, session_id: str, user: UserContext, limit: int = 20) -> list[ChatMessage]:
        """Return recent messages for a tenant-scoped chat session."""

    async def append_messages(self, *, session_id: str, user: UserContext, messages: list[ChatMessage]) -> None:
        """Persist tenant-scoped chat messages."""
