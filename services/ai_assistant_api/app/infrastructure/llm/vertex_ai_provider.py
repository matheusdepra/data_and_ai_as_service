from __future__ import annotations

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
        return LLMResponse(
            content=response.text or "",
            model=self._settings.vertex_model_name,
            metadata={"provider": "vertex_ai"},
        )

    def _to_gemini_prompt(self, messages: list[ChatMessage]) -> str:
        labels = {
            ChatRole.SYSTEM: "System",
            ChatRole.USER: "User",
            ChatRole.ASSISTANT: "Assistant",
            ChatRole.TOOL: "Tool",
        }
        return "\n\n".join(f"{labels[message.role]}: {message.content}" for message in messages)
