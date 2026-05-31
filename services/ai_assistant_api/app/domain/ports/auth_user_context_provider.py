from __future__ import annotations

from collections.abc import Mapping
from typing import Protocol

from app.domain.models.chat import UserContext


class AuthUserContextProvider(Protocol):
    async def resolve_user_context(
        self, *, headers: Mapping[str, str], requested_user_id: str | None = None
    ) -> UserContext:
        """Resolve tenant/user/role from trusted auth context, not from free tenant input."""
