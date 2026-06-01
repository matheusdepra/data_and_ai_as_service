from __future__ import annotations

import pytest

from app.application.services.tool_service import ToolExecutionResult, ToolService
from app.domain.models.chat import ChatMessage, ChatRole, ChatScope, LLMResponse, UserContext


class FakeIngestionApiClient:
    def __init__(self) -> None:
        self.preview_calls: list[dict[str, object]] = []
        self.patch_calls: list[dict[str, object]] = []

    def get_json(self, *, path: str, request_headers: dict[str, str], allow_not_found: bool = False) -> dict[str, object]:
        if path.endswith("/overview"):
            return {
                "status": "ready",
                "overview": {
                    "dataset_header": {
                        "name": "Faturamento",
                        "classification": "Commercial / Billing",
                        "tags": ["Faturamento"],
                    },
                    "ai_understanding": {
                        "summary": "Dataset de faturamento para acompanhamento financeiro e operacional.",
                        "confidence": 0.81,
                    },
                    "business_description": {
                        "business_area": "Commercial",
                        "domain": "CRM",
                        "data_type": "Master Data",
                        "typical_usage": ["CRM", "Analytics"],
                    },
                },
            }
        return {}

    def post_json(
        self,
        *,
        path: str,
        payload: dict[str, object],
        request_headers: dict[str, str],
        allow_not_found: bool = False,
    ) -> dict[str, object]:
        self.preview_calls.append({"path": path, "payload": payload})
        return {
            "tenant_id": "tenant-a",
            "ingestion_id": "ing-1",
            "base_version": "v1",
            "semantic": payload["patch"],
            "patch": payload["patch"],
            "persisted": False,
        }

    def patch_json(
        self,
        *,
        path: str,
        payload: dict[str, object],
        request_headers: dict[str, str],
        if_match: str | None = None,
        allow_not_found: bool = False,
    ) -> dict[str, object]:
        self.patch_calls.append({"path": path, "payload": payload, "if_match": if_match})
        return {
            "ok": True,
            "tenant_id": "tenant-a",
            "ingestion_id": "ing-1",
            "base_version": "v1",
            "reason": payload["reason"],
            "semantic": payload["patch"],
        }


class FakeLLMProvider:
    def __init__(self, content: str) -> None:
        self.content = content
        self.calls: list[list[ChatMessage]] = []

    async def generate(self, messages: list[ChatMessage]) -> LLMResponse:
        self.calls.append(messages)
        return LLMResponse(content=self.content, model="fake-llm")


def _user() -> UserContext:
    return UserContext(user_id="u1", tenant_id="tenant-a", role="editor")


def _headers() -> dict[str, str]:
    return {"x-dev-tenant-id": "tenant-a", "x-user-role": "editor"}


@pytest.mark.asyncio
async def test_preview_deterministic_typical_usage_is_structured_and_textual() -> None:
    service = ToolService(FakeIngestionApiClient(), llm_provider=None)  # type: ignore[arg-type]

    response = await service.maybe_handle_dataset_overview_turn(
        user=_user(),
        message="oi vamos trocar o usage, me ajuda a formatar CRM, Analise de Cliente e Vendas",
        request_scope=ChatScope(screen="dataset_overview", ingestion_id="ing-1"),
        request_headers=_headers(),
        history=[],
    )

    assert response is not None
    assert isinstance(response, ToolExecutionResult)
    assert response.tool_name == "preview_semantic_patch"
    assert response.direct_response is True
    assert response.metadata["target_field"] == "business_description.typical_usage"
    assert response.metadata["intent_type"] == "set_list"
    assert response.metadata["requires_confirmation"] is True
    assert response.metadata["proposal_summary"] == "Atualizar o uso típico para CRM, Análise de Cliente e Vendas"
    assert response.metadata["patch"] == {
        "business_description": {"typical_usage": ["CRM", "Análise de Cliente", "Vendas"]}
    }
    assert response.response_text == (
        "Posso atualizar o uso típico para CRM, Análise de Cliente e Vendas. "
        "Quer aplicar ou salvar essa alteração?"
    )
    assert "{" not in response.response_text


@pytest.mark.asyncio
async def test_preview_explicit_ai_summary_uses_user_text_in_first_turn() -> None:
    service = ToolService(FakeIngestionApiClient(), llm_provider=None)  # type: ignore[arg-type]
    desired_summary = (
        "Este dataset representa o cadastro básico de clientes OLIST e é fundamental para gerenciamento "
        "de relacionamento com o cliente."
    )

    response = await service.maybe_handle_dataset_overview_turn(
        user=_user(),
        message=f"Troca o AI Understanding para {desired_summary}",
        request_scope=ChatScope(screen="dataset_overview", ingestion_id="ing-1"),
        request_headers=_headers(),
        history=[],
    )

    assert response is not None
    assert response.metadata["target_field"] == "ai_understanding.summary"
    assert response.metadata["intent_type"] == "replace"
    assert response.metadata["patch"] == {"ai_understanding": {"summary": desired_summary}}
    assert response.response_text == (
        f'Posso atualizar o AI Summary para refletir: "{desired_summary}". '
        "Quer aplicar ou salvar essa alteração?"
    )


@pytest.mark.asyncio
async def test_preview_ai_summary_can_be_proposed_by_llm_without_exact_text() -> None:
    llm = FakeLLMProvider(
        """
        {
          "should_patch": true,
          "reason": "The user wants a more executive AI Summary.",
          "intent_type": "rewrite",
          "target_field": "ai_understanding.summary",
          "proposal_summary": "Atualizar o AI Summary para uma descrição mais executiva.",
          "confidence": 0.78,
          "patch": {
            "ai_understanding": {
              "summary": "Resumo executivo do cadastro de clientes OLIST com foco em CRM, segmentação e análise de cliente."
            }
          }
        }
        """
    )
    service = ToolService(FakeIngestionApiClient(), llm_provider=llm)

    response = await service.maybe_handle_dataset_overview_turn(
        user=_user(),
        message="Quero melhorar o AI Summary para ficar mais executivo",
        request_scope=ChatScope(screen="dataset_overview", ingestion_id="ing-1"),
        request_headers=_headers(),
        history=[],
    )

    assert response is not None
    assert response.metadata["target_field"] == "ai_understanding.summary"
    assert response.metadata["intent_type"] == "rewrite"
    assert response.metadata["source"] == "llm"
    assert len(llm.calls) == 1
    assert "Recent conversation" in llm.calls[0][0].content
    assert response.response_text == (
        'Posso atualizar o AI Summary para refletir: '
        '"Resumo executivo do cadastro de clientes OLIST com foco em CRM, segmentação e análise de cliente.". '
        "Quer aplicar ou salvar essa alteração?"
    )


@pytest.mark.asyncio
async def test_sumario_da_ia_alias_also_triggers_llm_summary_preview() -> None:
    llm = FakeLLMProvider(
        """
        {
          "should_patch": true,
          "reason": "The user wants a more precise AI Summary focused on customer data.",
          "intent_type": "rewrite",
          "target_field": "ai_understanding.summary",
          "proposal_summary": "Atualizar o AI Summary para refletir dados de clientes.",
          "confidence": 0.84,
          "patch": {
            "ai_understanding": {
              "summary": "Este dataset contém dados de clientes, como identificadores e localização geográfica. É ideal para CRM, segmentação e análise de clientes."
            }
          }
        }
        """
    )
    service = ToolService(FakeIngestionApiClient(), llm_provider=llm)

    response = await service.maybe_handle_dataset_overview_turn(
        user=_user(),
        message="Me ajuda a refinar o sumário de IA",
        request_scope=ChatScope(screen="dataset_overview", ingestion_id="ing-1"),
        request_headers=_headers(),
        history=[],
    )

    assert response is not None
    assert response.metadata["target_field"] == "ai_understanding.summary"
    assert response.metadata["source"] == "llm"
    assert len(llm.calls) == 1
    assert response.response_text == (
        'Posso atualizar o AI Summary para refletir: '
        '"Este dataset contém dados de clientes, como identificadores e localização geográfica. '
        'É ideal para CRM, segmentação e análise de clientes.". '
        "Quer aplicar ou salvar essa alteração?"
    )


@pytest.mark.asyncio
async def test_pending_summary_clarification_repeats_current_proposal_without_overwriting_patch() -> None:
    service = ToolService(FakeIngestionApiClient(), llm_provider=None)  # type: ignore[arg-type]

    response = await service.maybe_handle_dataset_overview_turn(
        user=_user(),
        message=(
            "Isso altera para: Este dataset representa Faturamento e parece suportar fluxos de trabalho "
            "de vendas na área comercial. É mais adequado para CRM, segmentação."
        ),
        request_scope=ChatScope(screen="dataset_overview", ingestion_id="ing-1"),
        request_headers=_headers(),
        history=[
            ChatMessage(role=ChatRole.USER, content="Me ajuda a refinar o sumário de IA"),
            ChatMessage(
                role=ChatRole.ASSISTANT,
                content=(
                    'Posso atualizar o AI Summary para refletir: "Este dataset contém dados de clientes, '
                    'como identificadores, localização geográfica e informações de contato. '
                    'É ideal para CRM, segmentação e análise de clientes.". '
                    "Quer aplicar ou salvar essa alteração?"
                ),
                metadata={
                    "tool": "preview_semantic_patch",
                    "persisted": False,
                    "response_language": "pt-BR",
                    "target_field": "ai_understanding.summary",
                    "intent_type": "rewrite",
                    "proposal_summary": "Atualizar o AI Summary para refletir dados de clientes.",
                    "requires_confirmation": True,
                    "confidence": 0.84,
                    "source": "llm",
                    "patch": {
                        "ai_understanding": {
                            "summary": (
                                "Este dataset contém dados de clientes, como identificadores, "
                                "localização geográfica e informações de contato. "
                                "É ideal para CRM, segmentação e análise de clientes."
                            )
                        }
                    },
                    "reason": "Requested in chat: Me ajuda a refinar o sumário de IA",
                    "base_version": "v1",
                    "ingestion_id": "ing-1",
                },
            ),
        ],
    )

    assert response is not None
    assert response.tool_name == "preview_semantic_patch"
    assert response.direct_response is True
    assert response.metadata["patch"] == {
        "ai_understanding": {
            "summary": (
                "Este dataset contém dados de clientes, como identificadores, "
                "localização geográfica e informações de contato. "
                "É ideal para CRM, segmentação e análise de clientes."
            )
        }
    }
    assert response.response_text == (
        'A proposta atual para o AI Summary é: "Este dataset contém dados de clientes, '
        'como identificadores, localização geográfica e informações de contato. '
        'É ideal para CRM, segmentação e análise de clientes.". '
        "Quer aplicar ou salvar essa alteração?"
    )


@pytest.mark.asyncio
async def test_tags_can_be_inferred_from_recent_history_by_llm() -> None:
    llm = FakeLLMProvider(
        """
        {
          "should_patch": true,
          "reason": "The recent conversation already defined the desired tags.",
          "intent_type": "set_list",
          "target_field": "dataset_header.tags",
          "proposal_summary": "Atualizar as tags para Clientes, Cadastro e OLIST",
          "confidence": 0.82,
          "patch": {
            "dataset_header": {
              "tags": ["Clientes", "Cadastro", "OLIST"]
            }
          }
        }
        """
    )
    service = ToolService(FakeIngestionApiClient(), llm_provider=llm)

    response = await service.maybe_handle_dataset_overview_turn(
        user=_user(),
        message="2 vamos atualizar as tags",
        request_scope=ChatScope(screen="dataset_overview", ingestion_id="ing-1"),
        request_headers=_headers(),
        history=[
            ChatMessage(
                role=ChatRole.ASSISTANT,
                content=(
                    "Podemos adicionar as tags Clientes, Cadastro e OLIST e remover Faturamento "
                    "para alinhar a interpretação."
                ),
            )
        ],
    )

    assert response is not None
    assert response.metadata["target_field"] == "dataset_header.tags"
    assert response.metadata["patch"] == {"dataset_header": {"tags": ["Clientes", "Cadastro", "OLIST"]}}
    assert response.response_text == (
        "Posso atualizar as tags para Clientes, Cadastro e OLIST. Quer aplicar ou salvar essa alteração?"
    )


@pytest.mark.asyncio
async def test_invalid_list_value_is_blocked_locally() -> None:
    service = ToolService(FakeIngestionApiClient(), llm_provider=None)  # type: ignore[arg-type]

    response = await service.maybe_handle_dataset_overview_turn(
        user=_user(),
        message="tags para tags",
        request_scope=ChatScope(screen="dataset_overview", ingestion_id="ing-1"),
        request_headers=_headers(),
        history=[],
    )

    assert response is not None
    assert response.tool_name == "clarify_semantic_patch"
    assert response.response_text == (
        "Não consegui montar um valor válido para as tags. "
        "Me diga a lista ou o texto final que você quer aplicar."
    )


@pytest.mark.asyncio
async def test_dataset_name_change_is_rejected_with_clear_supported_scope_message() -> None:
    client = FakeIngestionApiClient()
    service = ToolService(client, llm_provider=None)  # type: ignore[arg-type]

    response = await service.maybe_handle_dataset_overview_turn(
        user=_user(),
        message="TRoca o nome do dataset para Cliente",
        request_scope=ChatScope(screen="dataset_overview", ingestion_id="ing-1"),
        request_headers=_headers(),
        history=[],
    )

    assert response is not None
    assert response.tool_name == "clarify_semantic_patch"
    assert response.response_text == (
        "Hoje eu não consigo alterar o nome do dataset por esse fluxo semântico. "
        "Aqui eu posso refinar campos como classificação, tags, AI Summary, business area, domain, "
        "data type, typical usage e terms."
    )
    assert client.preview_calls == []
    assert client.patch_calls == []


@pytest.mark.asyncio
async def test_plain_question_does_not_call_llm_extractor_or_open_preview() -> None:
    llm = FakeLLMProvider(
        '{"should_patch": true, "target_field": "ai_understanding.summary", "patch": {"ai_understanding": {"summary": "bad"}}}'
    )
    service = ToolService(FakeIngestionApiClient(), llm_provider=llm)

    response = await service.maybe_handle_dataset_overview_turn(
        user=_user(),
        message="qual é a qualidade desse dataset?",
        request_scope=ChatScope(screen="dataset_overview", ingestion_id="ing-1"),
        request_headers=_headers(),
        history=[],
    )

    assert response is None
    assert llm.calls == []


@pytest.mark.asyncio
async def test_terms_meaning_question_does_not_open_semantic_edit_flow() -> None:
    llm = FakeLLMProvider(
        '{"should_patch": true, "target_field": "terms", "patch": {"terms": ["Cliente", "CRM"]}}'
    )
    service = ToolService(FakeIngestionApiClient(), llm_provider=llm)

    response = await service.maybe_handle_dataset_overview_turn(
        user=_user(),
        message="podemos mudar os Key Business Terms? o que eles significam?",
        request_scope=ChatScope(screen="dataset_overview", ingestion_id="ing-1"),
        request_headers=_headers(),
        history=[],
    )

    assert response is None
    assert llm.calls == []


@pytest.mark.asyncio
@pytest.mark.parametrize("confirmation", ["aplica", "aplicar", "salva", "salvar", "pode aplicar", "apply"])
async def test_short_affirmations_apply_exact_pending_patch(confirmation: str) -> None:
    client = FakeIngestionApiClient()
    service = ToolService(client, llm_provider=None)  # type: ignore[arg-type]

    response = await service.maybe_handle_dataset_overview_turn(
        user=_user(),
        message=confirmation,
        request_scope=ChatScope(screen="dataset_overview", ingestion_id="ing-1"),
        request_headers=_headers(),
        history=[
            ChatMessage(role=ChatRole.USER, content="quero alterar o AI Summary"),
            ChatMessage(
                role=ChatRole.ASSISTANT,
                content="Posso atualizar o AI Summary. Quer aplicar ou salvar essa alteração?",
                metadata={
                    "tool": "preview_semantic_patch",
                    "persisted": False,
                    "response_language": "pt-BR",
                    "target_field": "ai_understanding.summary",
                    "intent_type": "rewrite",
                    "proposal_summary": "Atualizar o AI Summary para uma descrição mais executiva.",
                    "requires_confirmation": True,
                    "confidence": 0.77,
                    "source": "llm",
                    "patch": {
                        "ai_understanding": {
                            "summary": "Resumo executivo para acompanhamento de clientes, vendas e faturamento."
                        }
                    },
                    "reason": "Requested in chat: quero alterar o AI Summary",
                    "base_version": "v1",
                    "ingestion_id": "ing-1",
                },
            ),
        ],
    )

    assert response is not None
    assert response.tool_name == "apply_semantic_patch"
    assert response.direct_response is True
    assert response.metadata["target_field"] == "ai_understanding.summary"
    assert client.patch_calls[0]["payload"] == {
        "reason": "Requested in chat: quero alterar o AI Summary",
        "patch": {
            "ai_understanding": {
                "summary": "Resumo executivo para acompanhamento de clientes, vendas e faturamento."
            }
        },
    }


@pytest.mark.asyncio
async def test_apply_inherits_language_from_previous_intent() -> None:
    client = FakeIngestionApiClient()
    service = ToolService(client, llm_provider=None)  # type: ignore[arg-type]

    response = await service.maybe_handle_dataset_overview_turn(
        user=_user(),
        message="guardar",
        request_scope=ChatScope(screen="dataset_overview", ingestion_id="ing-1"),
        request_headers=_headers(),
        history=[
            ChatMessage(role=ChatRole.USER, content="hola vamos a cambiar el uso"),
            ChatMessage(
                role=ChatRole.ASSISTANT,
                content="Puedo actualizar el uso típico. ¿Quieres aplicar o guardar este cambio?",
                metadata={
                    "tool": "preview_semantic_patch",
                    "persisted": False,
                    "response_language": "es",
                    "target_field": "business_description.typical_usage",
                    "intent_type": "set_list",
                    "proposal_summary": "Actualizar el uso típico a CRM, Análisis de Cliente y Ventas",
                    "requires_confirmation": True,
                    "confidence": 0.82,
                    "source": "llm",
                    "patch": {
                        "business_description": {
                            "typical_usage": ["CRM", "Análisis de Cliente", "Ventas"]
                        }
                    },
                    "reason": "Requested in chat: hola vamos a cambiar el uso",
                    "base_version": "v1",
                    "ingestion_id": "ing-1",
                },
            ),
        ],
    )

    assert response is not None
    assert response.metadata["response_language"] == "es"
    assert response.response_text == (
        "Actualicé el uso típico a CRM, Análisis de Cliente y Ventas. "
        "Los hechos técnicos del dataset no cambiaron."
    )
