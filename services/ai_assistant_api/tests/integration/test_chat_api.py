from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app


def test_health_endpoint() -> None:
    client = TestClient(create_app())

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_chat_messages_endpoint() -> None:
    client = TestClient(create_app())

    response = client.post(
        "/api/v1/chat/messages",
        json={
            "session_id": "abc123",
            "user_id": "user-001",
            "message": "What were the sales by month?",
            "prompt_key": "data_analyst",
            "context": {"dataset": "sales", "tables": ["orders", "customers"], "filters": {"year": 2025}},
        },
        headers={"x-dev-tenant-id": "tenant-a"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == "abc123"
    assert body["used_prompt_key"] == "data_analyst"
    assert body["used_context_sources"] == ["bigquery:sales.orders", "bigquery:sales.customers"]
    assert body["metadata"]["model"] == "mock-llm"
