from __future__ import annotations

import pytest

from app.api.v1.deps import get_send_chat_message_use_case
from app.application.use_cases.send_chat_message import SendChatMessageCommand


@pytest.mark.asyncio
async def test_send_chat_message_orchestrates_mock_response() -> None:
    use_case = get_send_chat_message_use_case()
    command = SendChatMessageCommand(
        session_id="abc123",
        user_id="user-001",
        message="What were the sales by month?",
        prompt_key="data_analyst",
        context={"dataset": "sales", "tables": ["orders"], "filters": {"year": 2025}},
    )

    response = await use_case.execute(command=command, headers={"x-dev-tenant-id": "tenant-a"})

    assert response.session_id == "abc123"
    assert response.used_prompt_key == "data_analyst"
    assert response.used_context_sources == ["bigquery:sales.orders"]
    assert response.metadata["model"] == "mock-llm"
    assert "What were the sales by month?" in response.answer
