from __future__ import annotations

from dataclasses import dataclass

import pytest

from app.application.services.chat_service import ChatService
from app.application.services.tool_service import ToolExecutionResult
from app.domain.models.chat import ChatMessage, ChatRequestContext, ChatRole, ChatScope, LLMResponse, UserContext


@dataclass
class FakeRetrievedContext:
    content: str
    sources: list[str]


class FakePromptService:
    async def render_prompt(self, *, prompt_key: str, variables: dict) -> str:
        return f"{prompt_key}:{variables['context']}"


class FakeContextService:
    def __init__(self) -> None:
        self.calls = 0

    async def retrieve_context(self, **kwargs) -> FakeRetrievedContext:
        self.calls += 1
        return FakeRetrievedContext(content='{"dataset":"demo"}', sources=["context:demo"])


class FakeHistoryRepository:
    def __init__(self) -> None:
        self.appended: list[ChatMessage] = []

    async def list_messages(self, **kwargs) -> list[ChatMessage]:
        return []

    async def append_messages(self, **kwargs) -> None:
        self.appended = kwargs["messages"]


class FakeLLMProvider:
    def __init__(self) -> None:
        self.calls = 0

    async def generate(self, messages: list[ChatMessage]) -> LLMResponse:
        self.calls += 1
        return LLMResponse(content="llm answer", model="fake-llm")


class FakeToolService:
    def __init__(self, result: ToolExecutionResult | None) -> None:
        self.result = result

    async def maybe_handle_dataset_overview_turn(self, **kwargs) -> ToolExecutionResult | None:
        return self.result


@pytest.mark.asyncio
async def test_chat_service_uses_direct_tool_response_without_calling_llm() -> None:
    history_repository = FakeHistoryRepository()
    context_service = FakeContextService()
    llm_provider = FakeLLMProvider()
    chat_service = ChatService(
        prompt_service=FakePromptService(),
        context_service=context_service,
        history_repository=history_repository,
        llm_provider=llm_provider,
        tool_service=FakeToolService(
            ToolExecutionResult(
                tool_name="preview_semantic_patch",
                sources=["tool:preview_semantic_patch"],
                llm_context='{"status":"previewed"}',
                metadata={
                    "tool": "preview_semantic_patch",
                    "persisted": False,
                    "response_language": "pt-BR",
                    "target_field": "ai_understanding.summary",
                },
                response_text="Posso atualizar o AI Summary. Quer aplicar ou salvar essa alteração?",
                direct_response=True,
            )
        ),
    )

    response = await chat_service.send_message(
        session_id="s1",
        user=UserContext(user_id="u1", tenant_id="tenant-a", role="editor"),
        message="quero alterar o AI Summary",
        prompt_key="dataset_overview",
        request_context=ChatRequestContext(),
        request_scope=ChatScope(screen="dataset_overview", ingestion_id="ing-1"),
        request_headers={"x-dev-tenant-id": "tenant-a"},
    )

    assert response.answer == "Posso atualizar o AI Summary. Quer aplicar ou salvar essa alteração?"
    assert response.metadata["model"] == "tool-service"
    assert llm_provider.calls == 0
    assert context_service.calls == 0
    assert history_repository.appended[1].role is ChatRole.ASSISTANT
