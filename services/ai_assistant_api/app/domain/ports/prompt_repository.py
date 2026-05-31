from __future__ import annotations

from typing import Protocol

from app.domain.models.prompt import PromptTemplate


class PromptRepository(Protocol):
    async def get_by_key(self, key: str) -> PromptTemplate:
        """Return a reusable prompt template by key."""
