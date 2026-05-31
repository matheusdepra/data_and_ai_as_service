from __future__ import annotations

from collections import defaultdict

from app.domain.models.chat import ChatMessage, UserContext


class InMemoryChatHistoryRepository:
    def __init__(self) -> None:
        self._messages: dict[tuple[str, str], list[ChatMessage]] = defaultdict(list)

    def _key(self, *, session_id: str, user: UserContext) -> tuple[str, str]:
        return (user.tenant_id, session_id)

    async def list_messages(self, *, session_id: str, user: UserContext, limit: int = 20) -> list[ChatMessage]:
        messages = self._messages[self._key(session_id=session_id, user=user)]
        return messages[-limit:]

    async def append_messages(self, *, session_id: str, user: UserContext, messages: list[ChatMessage]) -> None:
        self._messages[self._key(session_id=session_id, user=user)].extend(messages)
