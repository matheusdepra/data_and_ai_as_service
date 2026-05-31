from __future__ import annotations

from collections.abc import Mapping
from pydantic import BaseModel, Field

from app.application.services.chat_service import ChatService
from app.domain.models.chat import ChatRequestContext, ChatResponse
from app.domain.ports.auth_user_context_provider import AuthUserContextProvider


class SendChatMessageCommand(BaseModel):
    session_id: str = Field(min_length=1)
    user_id: str | None = Field(default=None, min_length=1)
    message: str = Field(min_length=1)
    prompt_key: str = Field(default="data_analyst", min_length=1)
    context: ChatRequestContext = Field(default_factory=ChatRequestContext)


class SendChatMessageUseCase:
    def __init__(self, *, chat_service: ChatService, auth_provider: AuthUserContextProvider) -> None:
        self._chat_service = chat_service
        self._auth_provider = auth_provider

    async def execute(self, *, command: SendChatMessageCommand, headers: Mapping[str, str]) -> ChatResponse:
        user = await self._auth_provider.resolve_user_context(headers=headers, requested_user_id=command.user_id)
        return await self._chat_service.send_message(
            session_id=command.session_id,
            user=user,
            message=command.message,
            prompt_key=command.prompt_key,
            request_context=command.context,
        )
