from __future__ import annotations

import pytest

from app.application.services.tool_service import ToolExecutionResult, ToolService
from app.domain.models.chat import ChatMessage, ChatRole, ChatScope, UserContext


class FakeIngestionApiClient:
    def __init__(self) -> None:
        self.preview_calls: list[dict[str, object]] = []
        self.patch_calls: list[dict[str, object]] = []

    def get_json(self, *, path: str, request_headers: dict[str, str], allow_not_found: bool = False) -> dict[str, object]:
        if path.endswith("/overview"):
            return {
                "status": "ready",
                "overview": {
                    "business_description": {
                        "business_area": "Commercial",
                        "domain": "CRM",
                        "data_type": "Master Data",
                    }
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


@pytest.mark.asyncio
async def test_tool_service_previews_semantic_patch_before_persisting() -> None:
    service = ToolService(FakeIngestionApiClient(), llm_provider=None)  # type: ignore[arg-type]
    user = UserContext(user_id="u1", tenant_id="tenant-a", role="editor")

    response = await service.maybe_handle_dataset_overview_turn(
        user=user,
        message="Nao e de CRM e de Marketing",
        request_scope=ChatScope(screen="dataset_overview", ingestion_id="ing-1"),
        request_headers={"x-dev-tenant-id": "tenant-a", "x-user-role": "editor"},
        history=[],
    )

    assert response is not None
    assert isinstance(response, ToolExecutionResult)
    assert response.metadata["tool"] == "preview_semantic_patch"
    assert "confirm" in response.llm_context.casefold()
    assert response.metadata["patch"] == {"business_description": {"domain": "Marketing"}}


@pytest.mark.asyncio
async def test_tool_service_applies_confirmed_semantic_patch() -> None:
    client = FakeIngestionApiClient()
    service = ToolService(client, llm_provider=None)  # type: ignore[arg-type]
    user = UserContext(user_id="u1", tenant_id="tenant-a", role="editor")

    response = await service.maybe_handle_dataset_overview_turn(
        user=user,
        message="confirm",
        request_scope=ChatScope(screen="dataset_overview", ingestion_id="ing-1"),
        request_headers={"x-dev-tenant-id": "tenant-a", "x-user-role": "editor"},
        history=[
            ChatMessage(
                role=ChatRole.ASSISTANT,
                content="I prepared a semantic refinement proposal.",
                metadata={
                    "tool": "preview_semantic_patch",
                    "persisted": False,
                    "patch": {"business_description": {"domain": "Marketing"}},
                    "reason": "Requested in chat: Nao e de CRM e de Marketing",
                    "base_version": "v1",
                    "ingestion_id": "ing-1",
                },
            )
        ],
    )

    assert response is not None
    assert response.metadata["tool"] == "apply_semantic_patch"
    assert response.metadata["persisted"] is True
    assert client.patch_calls[0]["if_match"] == "v1"
