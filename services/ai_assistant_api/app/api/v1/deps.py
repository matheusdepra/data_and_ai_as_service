from __future__ import annotations

from functools import lru_cache

from app.application.services.chat_service import ChatService
from app.application.services.context_service import ContextService
from app.application.services.prompt_service import PromptService
from app.application.services.tool_service import ToolService
from app.application.use_cases.send_chat_message import SendChatMessageUseCase
from app.core.config import Settings, get_settings
from app.infrastructure.auth.mock_auth_user_context_provider import MockAuthUserContextProvider
from app.infrastructure.bigquery.bigquery_repository import GoogleBigQueryRepository
from app.infrastructure.clients.ingestion_api_client import IngestionApiClient
from app.infrastructure.context.bigquery_context_retriever import BigQueryContextRetriever
from app.infrastructure.llm.mock_llm_provider import MockLLMProvider
from app.infrastructure.llm.vertex_ai_provider import VertexAIGeminiProvider
from app.infrastructure.memory.in_memory_chat_history_repository import InMemoryChatHistoryRepository
from app.infrastructure.prompts.in_memory_prompt_repository import InMemoryPromptRepository


@lru_cache
def get_send_chat_message_use_case() -> SendChatMessageUseCase:
    settings = get_settings()
    prompt_repository = InMemoryPromptRepository()
    history_repository = InMemoryChatHistoryRepository()
    context_retriever = BigQueryContextRetriever()
    ingestion_api = IngestionApiClient(settings)
    llm_provider = _build_llm_provider(settings)
    bigquery_repository = GoogleBigQueryRepository(settings)
    chat_service = ChatService(
        prompt_service=PromptService(prompt_repository),
        context_service=ContextService(context_retriever),
        history_repository=history_repository,
        llm_provider=llm_provider,
        tool_service=ToolService(
            ingestion_api=ingestion_api,
            llm_provider=llm_provider,
            bigquery_repository=bigquery_repository,
        ),
        history_limit=settings.request_history_limit,
    )
    return SendChatMessageUseCase(chat_service=chat_service, auth_provider=MockAuthUserContextProvider(settings))


def _build_llm_provider(settings: Settings):
    if settings.llm_provider == "vertex_ai":
        return VertexAIGeminiProvider(settings)
    return MockLLMProvider()

