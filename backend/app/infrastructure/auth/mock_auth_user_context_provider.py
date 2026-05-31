from __future__ import annotations

from collections.abc import Mapping

from app.core.config import Settings
from app.domain.models.chat import UserContext


class MockAuthUserContextProvider:
    """Development auth context provider.

    TODO: Replace with Firebase/JWKS + Firestore membership resolver before prod.
    Tenant is resolved from trusted auth/membership in real environments; this mock
    supports local headers only for development and demos.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def resolve_user_context(
        self, *, headers: Mapping[str, str], requested_user_id: str | None = None
    ) -> UserContext:
        normalized = {key.lower(): value for key, value in headers.items()}
        return UserContext(
            user_id=normalized.get("x-user-id") or requested_user_id or "dev-user",
            tenant_id=normalized.get("x-dev-tenant-id") or self._settings.mock_tenant_id,
            role=normalized.get("x-user-role") or self._settings.mock_user_role,
            email=normalized.get("x-user-email"),
        )
