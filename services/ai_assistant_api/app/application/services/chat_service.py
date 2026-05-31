from __future__ import annotations

import time

from app.application.services.context_service import ContextService
from app.application.services.prompt_service import PromptService
from app.domain.models.chat import ChatMessage, ChatRequestContext, ChatResponse, ChatRole, UserContext
from app.domain.ports.chat_history_repository import ChatHistoryRepository
from app.domain.ports.llm_provider import LLMProvider


class ChatService:
    def __init__(
        self,
        *,
        prompt_service: PromptService,
        context_service: ContextService,
        history_repository: ChatHistoryRepository,
        llm_provider: LLMProvider,
        history_limit: int = 20,
    ) -> None:
        self._prompt_service = prompt_service
        self._context_service = context_service
        self._history_repository = history_repository
        self._llm_provider = llm_provider
        self._history_limit = history_limit

    async def send_message(
        self,
        *,
        session_id: str,
        user: UserContext,
        message: str,
        prompt_key: str,
        request_context: ChatRequestContext,
    ) -> ChatResponse:
        started = time.perf_counter()
        retrieved_context = await self._context_service.retrieve_context(user=user, request_context=request_context)
        system_prompt = await self._prompt_service.render_prompt(
            prompt_key=prompt_key,
            variables={
                "user_id": user.user_id,
                "tenant_id": user.tenant_id,
                "context": retrieved_context.content,
            },
        )
        history = await self._history_repository.list_messages(
            session_id=session_id,
            user=user,
            limit=self._history_limit,
        )
        user_message = ChatMessage(role=ChatRole.USER, content=message)
        messages = [ChatMessage(role=ChatRole.SYSTEM, content=system_prompt), *history, user_message]
        llm_response = await self._llm_provider.generate(messages)
        assistant_message = ChatMessage(
            role=ChatRole.ASSISTANT,
            content=llm_response.content,
            metadata={"model": llm_response.model, **llm_response.metadata},
        )
        await self._history_repository.append_messages(
            session_id=session_id,
            user=user,
            messages=[user_message, assistant_message],
        )
        latency_ms = int((time.perf_counter() - started) * 1000)
        return ChatResponse(
            session_id=session_id,
            answer=llm_response.content,
            used_prompt_key=prompt_key,
            used_context_sources=retrieved_context.sources,
            metadata={"model": llm_response.model, "latency_ms": latency_ms, **llm_response.metadata},
        )
