from __future__ import annotations

from typing import Any

from app.core.config import Settings
from app.domain.models.chat import ChatMessage, ChatRole, LLMResponse


class VertexAIGeminiProvider:
    """Vertex AI/Gemini adapter skeleton.

    TODO: Configure service account/IAM, regional endpoint, safety settings,
    retry/backoff, request timeouts, quota handling, and tracing for production.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def generate(self, messages: list[ChatMessage]) -> LLMResponse:
        import vertexai
        from vertexai.generative_models import GenerativeModel

        if not self._settings.gcp_project_id:
            raise ValueError("CHAT_GCP_PROJECT_ID is required for Vertex AI provider")

        vertexai.init(project=self._settings.gcp_project_id, location=self._settings.gcp_location)
        model = GenerativeModel(self._settings.vertex_model_name)
        prompt = self._to_gemini_prompt(messages)
        response = await model.generate_content_async(prompt)
        content, metadata = self._extract_response_payload(response)
        return LLMResponse(
            content=content or self._localized_empty_response(messages, metadata),
            model=self._settings.vertex_model_name,
            metadata={"provider": "vertex_ai", **metadata},
        )

    def _to_gemini_prompt(self, messages: list[ChatMessage]) -> str:
        labels = {
            ChatRole.SYSTEM: "System",
            ChatRole.USER: "User",
            ChatRole.ASSISTANT: "Assistant",
            ChatRole.TOOL: "Tool",
        }
        return "\n\n".join(f"{labels[message.role]}: {message.content}" for message in messages)

    def _extract_response_payload(self, response: Any) -> tuple[str | None, dict[str, Any]]:
        metadata: dict[str, Any] = {}

        try:
            direct_text = getattr(response, "text", None)
        except ValueError as exc:
            metadata["vertex_text_error"] = str(exc)
            direct_text = None

        if isinstance(direct_text, str) and direct_text.strip():
            return direct_text.strip(), metadata

        candidate_texts: list[str] = []
        finish_reasons: list[str] = []
        for candidate in getattr(response, "candidates", []) or []:
            finish_reason = getattr(candidate, "finish_reason", None)
            if finish_reason is not None:
                finish_reasons.append(getattr(finish_reason, "name", str(finish_reason)))
            content = getattr(candidate, "content", None)
            parts = getattr(content, "parts", None) or []
            for part in parts:
                text = getattr(part, "text", None)
                if isinstance(text, str) and text.strip():
                    candidate_texts.append(text.strip())

        if finish_reasons:
            metadata["finish_reasons"] = finish_reasons

        prompt_feedback = getattr(response, "prompt_feedback", None)
        if prompt_feedback is not None:
            block_reason = getattr(prompt_feedback, "block_reason", None)
            if block_reason not in (None, ""):
                metadata["block_reason"] = getattr(block_reason, "name", str(block_reason))
            block_reason_message = getattr(prompt_feedback, "block_reason_message", None)
            if isinstance(block_reason_message, str) and block_reason_message.strip():
                metadata["block_reason_message"] = block_reason_message.strip()

        combined = "\n".join(candidate_texts).strip()
        return (combined or None), metadata

    def _localized_empty_response(self, messages: list[ChatMessage], metadata: dict[str, Any]) -> str:
        language = self._detect_language(messages)
        blocked = "block_reason" in metadata
        if language == "pt-BR":
            if blocked:
                return (
                    "Eu não consegui gerar uma resposta textual para essa pergunta agora. "
                    "Pode tentar reformular em uma frase mais direta, por exemplo: "
                    '"qual é o score de qualidade deste dataset?"'
                )
            return (
                "Eu não consegui gerar uma resposta textual para essa pergunta agora. "
                "Tente repetir em uma frase mais direta ou pedir um resumo objetivo do que você quer analisar."
            )
        if language == "es":
            if blocked:
                return (
                    "No pude generar una respuesta textual para esta pregunta ahora. "
                    "Puedes reformularla de forma más directa, por ejemplo: "
                    '"¿cuál es el score de calidad de este dataset?"'
                )
            return (
                "No pude generar una respuesta textual para esta pregunta ahora. "
                "Intenta repetirla de forma más directa o pedir un resumen objetivo de lo que quieres analizar."
            )
        if blocked:
            return (
                "I couldn't generate a text answer for that question right now. "
                'Try rephrasing it more directly, for example: "what is the quality score of this dataset?"'
            )
        return (
            "I couldn't generate a text answer for that question right now. "
            "Try asking again in a more direct sentence or ask for a short summary of what you want to analyze."
        )

    def _detect_language(self, messages: list[ChatMessage]) -> str:
        latest_user = next((message for message in reversed(messages) if message.role is ChatRole.USER), None)
        text = latest_user.content.casefold() if latest_user else ""
        if any(token in text for token in ("qualidade", "dataset", "dado", "dados", "qual", "resumo", "score")):
            return "pt-BR"
        if any(token in text for token in ("calidad", "dato", "datos", "resumen", "puntaje", "cuál")):
            return "es"
        return "en"
