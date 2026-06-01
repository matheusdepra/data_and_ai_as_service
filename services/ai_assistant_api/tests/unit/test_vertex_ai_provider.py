from __future__ import annotations

from types import SimpleNamespace

from app.core.config import Settings
from app.domain.models.chat import ChatMessage, ChatRole
from app.infrastructure.llm.vertex_ai_provider import VertexAIGeminiProvider


class _ResponseWithFailingText:
    def __init__(self) -> None:
        self.candidates = [
            SimpleNamespace(
                finish_reason=SimpleNamespace(name="STOP"),
                content=SimpleNamespace(parts=[SimpleNamespace(text="Quality score is 92%.")]),
            )
        ]
        self.prompt_feedback = None

    @property
    def text(self) -> str:
        raise ValueError("Cannot get the response text.")


class _BlockedResponseWithoutText:
    def __init__(self) -> None:
        self.candidates = []
        self.prompt_feedback = SimpleNamespace(
            block_reason=SimpleNamespace(name="SAFETY"),
            block_reason_message="Blocked by safety filters.",
        )

    @property
    def text(self) -> str:
        raise ValueError("Cannot get the response text.")


def _provider() -> VertexAIGeminiProvider:
    return VertexAIGeminiProvider(Settings(gcp_project_id="demo-project"))


def test_extract_response_payload_uses_candidate_parts_when_text_property_fails() -> None:
    provider = _provider()

    content, metadata = provider._extract_response_payload(_ResponseWithFailingText())

    assert content == "Quality score is 92%."
    assert metadata["vertex_text_error"] == "Cannot get the response text."
    assert metadata["finish_reasons"] == ["STOP"]


def test_localized_empty_response_returns_portuguese_fallback_for_blocked_prompt() -> None:
    provider = _provider()
    _, metadata = provider._extract_response_payload(_BlockedResponseWithoutText())

    response = provider._localized_empty_response(
        [ChatMessage(role=ChatRole.USER, content="qual é a qualidade desse dataset?")],
        metadata,
    )

    assert "não consegui gerar uma resposta textual" in response.casefold()
    assert "score de qualidade" in response.casefold()
