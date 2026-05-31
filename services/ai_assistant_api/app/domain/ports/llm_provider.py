from __future__ import annotations

from typing import Protocol

from app.domain.models.chat import ChatMessage, LLMResponse


class LLMProvider(Protocol):
    async def generate(self, messages: list[ChatMessage]) -> LLMResponse:
        """Generate an assistant response from final assembled messages."""
