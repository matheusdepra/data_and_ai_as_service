from __future__ import annotations

import asyncio
import json
from collections.abc import Mapping
from dataclasses import dataclass

from app.domain.models.chat import ChatMessage, ChatRole, ChatScope, UserContext
from app.domain.ports.llm_provider import LLMProvider
from app.infrastructure.clients.ingestion_api_client import IngestionApiClient


@dataclass(frozen=True)
class ToolDescriptor:
    name: str
    description: str


@dataclass(frozen=True)
class ToolExecutionResult:
    tool_name: str
    sources: list[str]
    llm_context: str
    metadata: dict[str, object]


class ToolService:
    def __init__(self, ingestion_api: IngestionApiClient, llm_provider: LLMProvider) -> None:
        self._ingestion_api = ingestion_api
        self._llm_provider = llm_provider

    def list_available_tools(self, *, prompt_key: str) -> list[ToolDescriptor]:
        if prompt_key == "dataset_overview":
            return [
                ToolDescriptor(name="get_overview_context", description="Retrieve trusted dataset overview context."),
                ToolDescriptor(name="preview_semantic_patch", description="Preview an allowed semantic metadata change."),
                ToolDescriptor(name="apply_semantic_patch", description="Persist a confirmed semantic metadata change."),
            ]
        return []

    async def maybe_handle_dataset_overview_turn(
        self,
        *,
        user: UserContext,
        message: str,
        request_scope: ChatScope,
        request_headers: Mapping[str, str],
        history: list[ChatMessage],
    ) -> ToolExecutionResult | None:
        if request_scope.ingestion_id is None:
            return None

        normalized = message.strip().casefold()
        pending = self._recover_pending_action(history)

        if pending and _is_negative_confirmation(normalized):
            return ToolExecutionResult(
                tool_name="cancel_pending_semantic_patch",
                sources=["tool:cancel_pending_semantic_patch"],
                llm_context=json.dumps(
                    {
                        "status": "canceled",
                        "message": "Semantic change canceled. No metadata update was persisted.",
                    },
                    ensure_ascii=False,
                ),
                metadata={"tool": "cancel_pending_semantic_patch", "persisted": False},
            )

        if pending and _is_affirmative_confirmation(normalized):
            applied = await self._apply_semantic_patch(
                ingestion_id=pending.ingestion_id,
                reason=pending.reason,
                patch=pending.patch,
                if_match=pending.base_version,
                request_headers=request_headers,
            )
            semantic = applied.get("semantic") if isinstance(applied.get("semantic"), dict) else {}
            summary = _summarize_semantic_patch(pending.patch, semantic)
            return ToolExecutionResult(
                tool_name="apply_semantic_patch",
                sources=["tool:apply_semantic_patch"],
                llm_context=json.dumps(
                    {
                        "status": "applied",
                        "summary": summary,
                        "reason": pending.reason,
                        "semantic": semantic,
                        "guidance": "Tell the user the semantic update was persisted and that technical facts were not changed.",
                    },
                    ensure_ascii=False,
                ),
                metadata={"tool": "apply_semantic_patch", "persisted": True, "reason": pending.reason},
            )

        patch = await self._infer_semantic_patch(
            ingestion_id=request_scope.ingestion_id,
            message=message,
            request_headers=request_headers,
        )
        if not patch:
            return None

        preview = await self._preview_semantic_patch(
            ingestion_id=request_scope.ingestion_id,
            reason=f"Requested in chat: {message.strip()}",
            patch=patch,
            request_headers=request_headers,
        )
        preview_semantic = preview.get("semantic") if isinstance(preview.get("semantic"), dict) else {}
        pending_action = PendingSemanticAction(
            ingestion_id=request_scope.ingestion_id,
            reason=f"Requested in chat: {message.strip()}",
            patch=patch,
            base_version=str(preview.get("base_version") or "") or None,
            preview_semantic=preview_semantic,
        )
        summary = _summarize_semantic_patch(patch, preview_semantic)
        return ToolExecutionResult(
            tool_name="preview_semantic_patch",
            sources=["tool:preview_semantic_patch"],
            llm_context=json.dumps(
                {
                    "status": "previewed",
                    "summary": summary,
                    "reason": pending_action.reason,
                    "patch": patch,
                    "base_version": pending_action.base_version,
                    "semantic_preview": preview_semantic,
                    "guidance": "Ask for explicit confirmation before persisting. Suggest 'confirm', 'apply' or 'save'.",
                },
                ensure_ascii=False,
            ),
            metadata={
                "tool": "preview_semantic_patch",
                "persisted": False,
                "patch": patch,
                "reason": pending_action.reason,
                "base_version": pending_action.base_version,
                "ingestion_id": pending_action.ingestion_id,
            },
        )

    async def _infer_semantic_patch(
        self,
        *,
        ingestion_id: str,
        message: str,
        request_headers: Mapping[str, str],
    ) -> dict[str, object] | None:
        overview = await asyncio.to_thread(
            self._ingestion_api.get_json,
            path=f"/v1/ingestions/{ingestion_id}/overview",
            request_headers=request_headers,
            allow_not_found=True,
        )
        overview_payload = overview.get("overview") if isinstance(overview, dict) else {}
        business = overview_payload.get("business_description") if isinstance(overview_payload, dict) else {}
        current_business = business if isinstance(business, dict) else {}

        normalized = message.strip()
        lower = normalized.casefold()
        patch: dict[str, object] = {}

        correction = _extract_not_x_but_y(lower)
        if correction is not None:
            source, target = correction
            current_domain = str(current_business.get("domain") or "").casefold()
            if current_domain and source in current_domain:
                patch["business_description"] = {"domain": _title_case(target)}
            else:
                patch["dataset_header"] = {"classification": _title_case(target)}
                patch.setdefault("business_description", {})
                business_patch = patch["business_description"]
                if isinstance(business_patch, dict):
                    business_patch["domain"] = _title_case(target)

        if any(token in lower for token in ("business area", "area de negocio", "área de negócio", "area do negocio")):
            value = _extract_value_after_is(normalized)
            if value:
                patch.setdefault("business_description", {})
                business_patch = patch["business_description"]
                if isinstance(business_patch, dict):
                    business_patch["business_area"] = value

        if any(token in lower for token in ("domain", "dominio", "domínio")):
            value = _extract_value_after_is(normalized)
            if value:
                patch.setdefault("business_description", {})
                business_patch = patch["business_description"]
                if isinstance(business_patch, dict):
                    business_patch["domain"] = value

        if any(token in lower for token in ("classification", "classificacao", "classificação")):
            value = _extract_value_after_is(normalized)
            if value:
                patch.setdefault("dataset_header", {})
                header_patch = patch["dataset_header"]
                if isinstance(header_patch, dict):
                    header_patch["classification"] = value

        if any(token in lower for token in ("data type", "tipo de dado", "tipo do dado")):
            value = _extract_value_after_is(normalized)
            if value:
                patch.setdefault("business_description", {})
                business_patch = patch["business_description"]
                if isinstance(business_patch, dict):
                    business_patch["data_type"] = value

        if any(token in lower for token in ("tags", "tag")):
            values = _extract_csv_values(normalized)
            if values:
                patch.setdefault("dataset_header", {})
                header_patch = patch["dataset_header"]
                if isinstance(header_patch, dict):
                    header_patch["tags"] = values

        if any(token in lower for token in ("terms", "termos", "glossary")):
            values = _extract_csv_values(normalized)
            if values:
                patch["terms"] = values

        if any(token in lower for token in ("typical usage", "usage", "uso tipico", "uso típico")):
            values = _extract_csv_values(normalized)
            if values:
                patch.setdefault("business_description", {})
                business_patch = patch["business_description"]
                if isinstance(business_patch, dict):
                    business_patch["typical_usage"] = values

        if patch:
            return patch
        if not _should_consider_semantic_intent(lower):
            return None
        return await self._infer_semantic_patch_with_llm(
            ingestion_id=ingestion_id,
            message=message,
            request_headers=request_headers,
            overview=overview,
        )

    async def _infer_semantic_patch_with_llm(
        self,
        *,
        ingestion_id: str,
        message: str,
        request_headers: Mapping[str, str],
        overview: dict[str, object],
    ) -> dict[str, object] | None:
        prompt = (
            "You are a strict classifier for semantic metadata edits in Dativerso.\n"
            "Return JSON only with shape {\"should_patch\": boolean, \"reason\": string, \"patch\": object}.\n"
            "Only include fields allowed by this schema: "
            "{\"dataset_header\":{\"classification\":string,\"tags\":[string]},"
            "\"ai_understanding\":{\"summary\":string},"
            "\"business_description\":{\"business_area\":string,\"domain\":string,\"data_type\":string,\"typical_usage\":[string]},"
            "\"terms\":[string]}.\n"
            "If the user is only greeting, asking a question, or the correction is unclear, return should_patch false and patch {}.\n"
            f"Current overview context: {json.dumps(overview, ensure_ascii=False)}\n"
            f"User message: {message}"
        )
        llm_response = await self._llm_provider.generate(
            [
                ChatMessage(role=ChatRole.SYSTEM, content=prompt),
                ChatMessage(role=ChatRole.USER, content=message),
            ]
        )
        parsed = _extract_json_object(llm_response.content)
        if not parsed:
            return None
        if not bool(parsed.get("should_patch")):
            return None
        patch = parsed.get("patch")
        return patch if isinstance(patch, dict) and patch else None

    async def _preview_semantic_patch(
        self,
        *,
        ingestion_id: str,
        reason: str,
        patch: dict[str, object],
        request_headers: Mapping[str, str],
    ) -> dict[str, object]:
        return await asyncio.to_thread(
            self._ingestion_api.post_json,
            path=f"/v1/ingestions/{ingestion_id}/overview/semantic/preview",
            payload={"reason": reason, "patch": patch},
            request_headers=request_headers,
        )

    async def _apply_semantic_patch(
        self,
        *,
        ingestion_id: str,
        reason: str,
        patch: dict[str, object],
        if_match: str | None,
        request_headers: Mapping[str, str],
    ) -> dict[str, object]:
        return await asyncio.to_thread(
            self._ingestion_api.patch_json,
            path=f"/v1/ingestions/{ingestion_id}/overview/semantic",
            payload={"reason": reason, "patch": patch},
            request_headers=request_headers,
            if_match=if_match,
        )

    def _recover_pending_action(self, history: list[ChatMessage]) -> PendingSemanticAction | None:
        for message in reversed(history):
            if message.role is not ChatRole.ASSISTANT:
                continue
            metadata = message.metadata or {}
            if metadata.get("tool") != "preview_semantic_patch":
                continue
            if metadata.get("persisted") is not False:
                continue
            patch = metadata.get("patch")
            reason = metadata.get("reason")
            ingestion_id = metadata.get("ingestion_id")
            if not isinstance(patch, dict) or not isinstance(reason, str) or not isinstance(ingestion_id, str):
                continue
            base_version = metadata.get("base_version")
            return PendingSemanticAction(
                ingestion_id=ingestion_id,
                reason=reason,
                patch=patch,
                base_version=str(base_version) if base_version else None,
                preview_semantic={},
            )
        return None


@dataclass
class PendingSemanticAction:
    ingestion_id: str
    reason: str
    patch: dict[str, object]
    base_version: str | None
    preview_semantic: dict[str, object]


def _extract_not_x_but_y(message: str) -> tuple[str, str] | None:
    compact = " ".join(message.split())
    markers = [
        ("nao e de ", " e de "),
        ("não é de ", " é de "),
        ("not ", " but "),
    ]
    for prefix, middle in markers:
        if prefix in compact and middle in compact:
            _, after_prefix = compact.split(prefix, 1)
            if middle not in after_prefix:
                continue
            source, target = after_prefix.split(middle, 1)
            source_clean = source.strip(" .,!?:;")
            target_clean = target.strip(" .,!?:;")
            if source_clean and target_clean:
                return (source_clean, target_clean)
    return None


def _extract_value_after_is(message: str) -> str | None:
    markers = [" is ", " é ", " e "]
    normalized = " " + " ".join(message.split()) + " "
    for marker in markers:
        if marker in normalized:
            value = normalized.rsplit(marker, 1)[-1].strip(" .,!?:;")
            if value:
                return _title_case(value)
    return None


def _extract_csv_values(message: str) -> list[str]:
    if ":" in message:
        raw = message.split(":", 1)[1]
    elif "=" in message:
        raw = message.split("=", 1)[1]
    else:
        raw = message
    values = [_title_case(part.strip(" .,!?:;")) for part in raw.split(",")]
    return [value for value in values if value]


def _title_case(value: str) -> str:
    return " ".join(part.capitalize() for part in value.split())


def _is_affirmative_confirmation(message: str) -> bool:
    return any(token in message for token in ("confirm", "apply", "save", "persist", "pode salvar", "sim", "yes", "ok"))


def _is_negative_confirmation(message: str) -> bool:
    return any(token in message for token in ("cancel", "cancela", "nao", "não", "deixa"))


def _should_consider_semantic_intent(message: str) -> bool:
    return any(
        token in message
        for token in (
            "nao e",
            "não é",
            "deveria",
            "corrig",
            "correto",
            "errado",
            "mudar",
            "alterar",
            "classifica",
            "tag",
            "termo",
            "dominio",
            "domínio",
            "business area",
            "area de negocio",
            "área de negócio",
            "tipo de dado",
        )
    )


def _extract_json_object(value: str) -> dict[str, object] | None:
    raw = value.strip()
    candidates = [raw]
    if "{" in raw and "}" in raw:
        candidates.append(raw[raw.find("{") : raw.rfind("}") + 1])
    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            return parsed
    return None


def _summarize_semantic_patch(patch: dict[str, object], semantic: dict[str, object]) -> str:
    updates: list[str] = []
    dataset_header = patch.get("dataset_header")
    if isinstance(dataset_header, dict):
        if "classification" in dataset_header:
            updates.append(f"classification -> {dataset_header['classification']}")
        if "tags" in dataset_header:
            updates.append(f"tags -> {', '.join(dataset_header['tags'])}")
    business = patch.get("business_description")
    if isinstance(business, dict):
        for key in ("business_area", "domain", "data_type"):
            if key in business:
                updates.append(f"{key} -> {business[key]}")
        if "typical_usage" in business:
            usage = business["typical_usage"]
            if isinstance(usage, list):
                updates.append(f"typical_usage -> {', '.join(str(item) for item in usage)}")
    terms = patch.get("terms")
    if isinstance(terms, list):
        updates.append(f"terms -> {', '.join(str(term) for term in terms)}")
    if not updates and semantic:
        updates.append("The semantic overlay was updated")
    return "Proposed changes: " + "; ".join(updates) + "."
