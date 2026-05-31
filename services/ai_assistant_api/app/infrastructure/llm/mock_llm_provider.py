from __future__ import annotations

from app.domain.models.chat import ChatMessage, ChatRole, LLMResponse


class MockLLMProvider:
    async def generate(self, messages: list[ChatMessage]) -> LLMResponse:
        latest_user_message = next((message for message in reversed(messages) if message.role == ChatRole.USER), None)
        user_text = latest_user_message.content if latest_user_message else ""
        return LLMResponse(
            content=(
                "Mock answer: I received your question and assembled the prompt with explicit context. "
                f"Question: {user_text}"
            ),
            model="mock-llm",
            metadata={"provider": "mock"},
        )
