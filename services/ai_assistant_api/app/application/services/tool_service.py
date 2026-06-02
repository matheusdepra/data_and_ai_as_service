from __future__ import annotations

import asyncio
import json
import re
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Literal

from app.domain.models.chat import ChatMessage, ChatRole, ChatScope, UserContext
from app.domain.ports.bigquery_repository import BigQueryRepository
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
    response_text: str | None = None
    direct_response: bool = False


@dataclass(frozen=True)
class SemanticIntentProposal:
    target_field: str
    intent_type: Literal["replace", "rewrite", "set_list", "merge_list", "remove_from_list", "suggest"]
    proposed_patch: dict[str, object]
    proposal_summary: str
    response_language: str
    requires_confirmation: bool
    confidence: float | None
    source: Literal["deterministic", "llm"]


@dataclass(frozen=True)
class PendingSemanticAction:
    ingestion_id: str
    reason: str
    target_field: str
    intent_type: str
    proposed_patch: dict[str, object]
    proposal_summary: str
    response_language: str
    requires_confirmation: bool
    confidence: float | None
    source: str
    base_version: str | None


@dataclass(frozen=True)
class SemanticResolution:
    proposal: SemanticIntentProposal | None
    clarification_message: str | None = None


class ToolService:
    def __init__(
        self,
        ingestion_api: IngestionApiClient,
        llm_provider: LLMProvider,
        bigquery_repository: BigQueryRepository | None = None,
    ) -> None:
        self._ingestion_api = ingestion_api
        self._llm_provider = llm_provider
        self._bigquery_repository = bigquery_repository

    def list_available_tools(self, *, prompt_key: str) -> list[ToolDescriptor]:
        if prompt_key in {"dataset_overview", "dataset_copilot"}:
            return [
                ToolDescriptor(name="get_overview_context", description="Retrieve trusted dataset overview context."),
                ToolDescriptor(name="preview_semantic_patch", description="Preview an allowed semantic metadata change."),
                ToolDescriptor(name="apply_semantic_patch", description="Persist a confirmed semantic metadata change."),
                ToolDescriptor(name="run_overview_query", description="Run a read-only ad hoc query on the Silver table of this dataset."),
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
        language = _detect_user_language(message, history)
        pending = self._recover_pending_action(history)

        if pending and _is_negative_confirmation(normalized):
            return self._build_cancel_result(language)

        if pending and _is_affirmative_confirmation(normalized):
            return await self._build_apply_result(
                pending=pending,
                request_headers=request_headers,
                response_language=language,
            )
        if pending and _looks_like_pending_preview_clarification(message):
            return self._build_pending_preview_reminder_result(
                pending=pending,
                language=language,
            )
        unsupported_edit = _detect_unsupported_semantic_edit(message)
        if unsupported_edit is not None:
            return self._build_clarification_result(
                language=language,
                message_text=_localized_unsupported_field_message(language, unsupported_edit),
            )

        resolution = await self._resolve_semantic_intent(
            ingestion_id=request_scope.ingestion_id,
            message=message,
            response_language=language,
            request_headers=request_headers,
            history=history,
        )
        if resolution.clarification_message:
            return self._build_clarification_result(
                language=language,
                message_text=resolution.clarification_message,
            )
        if resolution.proposal is None:
            query_result = await self._maybe_run_exploratory_query(
                ingestion_id=request_scope.ingestion_id,
                message=message,
                user=user,
                request_headers=request_headers,
            )
            if query_result is not None:
                return query_result
            return None

        preview = await self._preview_semantic_patch(
            ingestion_id=request_scope.ingestion_id,
            reason=f"Requested in chat: {message.strip()}",
            patch=resolution.proposal.proposed_patch,
            request_headers=request_headers,
        )
        pending_action = PendingSemanticAction(
            ingestion_id=request_scope.ingestion_id,
            reason=f"Requested in chat: {message.strip()}",
            target_field=resolution.proposal.target_field,
            intent_type=resolution.proposal.intent_type,
            proposed_patch=resolution.proposal.proposed_patch,
            proposal_summary=resolution.proposal.proposal_summary,
            response_language=resolution.proposal.response_language,
            requires_confirmation=resolution.proposal.requires_confirmation,
            confidence=resolution.proposal.confidence,
            source=resolution.proposal.source,
            base_version=str(preview.get("base_version") or "") or None,
        )
        preview_semantic = preview.get("semantic") if isinstance(preview.get("semantic"), dict) else {}
        return self._build_preview_result(pending_action=pending_action, semantic_preview=preview_semantic)

    async def _maybe_run_exploratory_query(
        self,
        *,
        ingestion_id: str,
        message: str,
        user: UserContext,
        request_headers: Mapping[str, str],
    ) -> ToolExecutionResult | None:
        if self._bigquery_repository is None or self._llm_provider is None:
            return None

        # Fetch overview to get schema and details
        overview = await asyncio.to_thread(
            self._ingestion_api.get_json,
            path=f"/v1/ingestions/{ingestion_id}/overview",
            request_headers=request_headers,
            allow_not_found=True,
        )
        if not isinstance(overview, dict):
            return None
        
        overview_payload = overview.get("overview") if isinstance(overview, dict) else {}
        overview_data = overview_payload if isinstance(overview_payload, dict) else {}

        # Resolve table name from technical_summary or silver artifact
        detail = await asyncio.to_thread(
            self._ingestion_api.get_json,
            path=f"/v1/ingestions/{ingestion_id}",
            request_headers=request_headers,
            allow_not_found=True,
        )
        bq_table = None
        if isinstance(detail, dict):
            ingestion = detail.get("ingestion") or {}
            technical_summary = ingestion.get("technical_summary") or {}
            bq_table = technical_summary.get("bq_table")
        if not bq_table:
            tech = overview_data.get("technical_summary") or {}
            if isinstance(tech, dict):
                bq_table = tech.get("bq_table")
        if not bq_table:
            return None

        # Schema columns summary
        schema_data = overview_data.get("schema") or {}
        columns = schema_data.get("columns") or []
        if not columns:
            return None
        schema_summary = ", ".join(f"{c['normalized_name']} ({c['inferred_type']})" for c in columns)

        prompt = (
            "You are a strict SQL query generator for Dativerso.\n"
            "Given the dataset columns and the user's question, determine if the question requires querying the dataset's table.\n"
            "If yes, return JSON only with shape:\n"
            "{\"should_query\": true, \"sql\": \"SELECT ... FROM `<table_name>` ...\"}\n"
            "If no, return JSON only with shape:\n"
            "{\"should_query\": false}\n\n"
            f"Table name: {bq_table}\n"
            f"Columns and types: {schema_summary}\n"
            f"User question: {message}"
        )
        
        try:
            llm_response = await self._llm_provider.generate([
                ChatMessage(role=ChatRole.SYSTEM, content=prompt),
                ChatMessage(role=ChatRole.USER, content=message)
            ])
            parsed = _extract_json_object(llm_response.content)
            if not parsed or not bool(parsed.get("should_query")):
                return None
            
            sql = parsed.get("sql")
            if not isinstance(sql, str) or not sql.strip():
                return None

            if not _validate_sql_query(sql, bq_table, user.tenant_id):
                return ToolExecutionResult(
                    tool_name="run_overview_query",
                    sources=["tool:run_overview_query"],
                    llm_context="Error: SQL query validation failed. Make sure the query only references the allowed table and uses read-only operations.",
                    metadata={"tool": "run_overview_query", "error": "validation_failed", "sql": sql},
                    response_text="Desculpe, a consulta gerada para responder a sua pergunta não passou nas validações de segurança.",
                    direct_response=True,
                )

            rows = await self._bigquery_repository.execute_query(
                sql=sql,
                user=user,
                max_results=100,
            )
            
            return ToolExecutionResult(
                tool_name="run_overview_query",
                sources=["tool:run_overview_query"],
                llm_context=json.dumps({"status": "success", "results": rows}, ensure_ascii=False),
                metadata={
                    "tool": "run_overview_query",
                    "sql": sql,
                    "results_count": len(rows),
                    "client_actions": [
                        {
                            "type": "display_tabular_data",
                            "sql": sql,
                            "rows": rows,
                        }
                    ]
                },
                direct_response=False,
            )
        except Exception as exc:
            return ToolExecutionResult(
                tool_name="run_overview_query",
                sources=["tool:run_overview_query"],
                llm_context=f"Error executing query: {str(exc)}",
                metadata={"tool": "run_overview_query", "error": str(exc)},
                response_text="Desculpe, ocorreu um erro ao executar a consulta no banco de dados.",
                direct_response=True,
            )

    async def _resolve_semantic_intent(
        self,
        *,
        ingestion_id: str,
        message: str,
        response_language: str,
        request_headers: Mapping[str, str],
        history: list[ChatMessage],
    ) -> SemanticResolution:
        overview = await asyncio.to_thread(
            self._ingestion_api.get_json,
            path=f"/v1/ingestions/{ingestion_id}/overview",
            request_headers=request_headers,
            allow_not_found=True,
        )
        overview_payload = overview.get("overview") if isinstance(overview, dict) else {}
        overview_data = overview_payload if isinstance(overview_payload, dict) else {}
        normalized = message.strip()
        lower = normalized.casefold()

        deterministic = self._resolve_deterministic_semantic_intent(
            message=normalized,
            lower=lower,
            response_language=response_language,
            overview=overview_data,
        )
        if deterministic.proposal is not None or deterministic.clarification_message is not None:
            return deterministic

        if not _should_consider_semantic_intent(lower):
            return SemanticResolution(proposal=None)

        llm_proposal = await self._infer_semantic_proposal_with_llm(
            message=normalized,
            response_language=response_language,
            overview=overview,
            history=history,
        )
        if llm_proposal is None:
            return SemanticResolution(
                proposal=None,
                clarification_message=_localized_clarification_for_unresolved_intent(response_language),
            )
        return self._validate_semantic_proposal(llm_proposal)

    def _resolve_deterministic_semantic_intent(
        self,
        *,
        message: str,
        lower: str,
        response_language: str,
        overview: dict[str, object],
    ) -> SemanticResolution:
        if _looks_like_terms_meaning_question(lower):
            return SemanticResolution(proposal=None)

        summary_resolution = _resolve_summary_proposal(
            message=message,
            lower=lower,
            response_language=response_language,
        )
        if summary_resolution.proposal is not None or summary_resolution.clarification_message is not None:
            return self._validate_semantic_proposal(summary_resolution.proposal) if summary_resolution.proposal else summary_resolution

        list_resolution = _resolve_list_field_proposal(
            message=message,
            lower=lower,
            response_language=response_language,
        )
        if list_resolution.proposal is not None or list_resolution.clarification_message is not None:
            return self._validate_semantic_proposal(list_resolution.proposal) if list_resolution.proposal else list_resolution

        scalar_resolution = _resolve_scalar_field_proposal(
            message=message,
            lower=lower,
            response_language=response_language,
            overview=overview,
        )
        if scalar_resolution.proposal is not None or scalar_resolution.clarification_message is not None:
            return self._validate_semantic_proposal(scalar_resolution.proposal) if scalar_resolution.proposal else scalar_resolution

        return SemanticResolution(proposal=None)

    async def _infer_semantic_proposal_with_llm(
        self,
        *,
        message: str,
        response_language: str,
        overview: dict[str, object],
        history: list[ChatMessage],
    ) -> SemanticIntentProposal | None:
        if self._llm_provider is None:
            return None

        prompt = (
            "You are a strict classifier and patch extractor for semantic metadata edits in Dativerso.\n"
            "Return JSON only with shape "
            "{\"should_patch\": boolean, \"reason\": string, \"intent_type\": string, "
            "\"target_field\": string, \"proposal_summary\": string, \"confidence\": number, \"patch\": object}.\n"
            "Allowed target fields: dataset_header.classification, dataset_header.tags, ai_understanding.summary, "
            "business_description.business_area, business_description.domain, business_description.data_type, "
            "business_description.typical_usage, terms.\n"
            "Allowed intent_type values: replace, rewrite, set_list, merge_list, remove_from_list, suggest.\n"
            "If the user asks to change, improve, refine, or rewrite the AI Summary but gives no exact replacement, "
            "still propose a better ai_understanding.summary based on the current overview context.\n"
            "If the user asks about tags, terms, or typical usage and the recent conversation already proposed concrete values, "
            "you may reuse that recent proposal to build the patch.\n"
            "If the user is only greeting, asking a normal question, or the correction is unclear, return should_patch false and patch {}.\n"
            f"Preferred response language: {response_language}\n"
            f"Recent conversation: {json.dumps(_serialize_recent_history(history), ensure_ascii=False)}\n"
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
        if not parsed or not bool(parsed.get("should_patch")):
            return None

        patch = parsed.get("patch")
        target_field = parsed.get("target_field")
        intent_type = parsed.get("intent_type")
        if not isinstance(patch, dict) or not patch:
            return None

        inferred_target = target_field if isinstance(target_field, str) else _infer_target_field_from_patch(patch)
        if inferred_target is None:
            return None

        inferred_intent = intent_type if isinstance(intent_type, str) and intent_type else _default_intent_for_field(inferred_target)
        summary = parsed.get("proposal_summary")
        proposal_summary = (
            summary
            if isinstance(summary, str) and summary.strip()
            else _build_proposal_summary(inferred_target, patch, response_language)
        )
        confidence = parsed.get("confidence")
        return SemanticIntentProposal(
            target_field=inferred_target,
            intent_type=_normalize_intent_type(inferred_intent),
            proposed_patch=patch,
            proposal_summary=proposal_summary,
            response_language=response_language,
            requires_confirmation=True,
            confidence=float(confidence) if isinstance(confidence, (int, float)) else 0.72,
            source="llm",
        )

    def _validate_semantic_proposal(self, proposal: SemanticIntentProposal | None) -> SemanticResolution:
        if proposal is None:
            return SemanticResolution(proposal=None)

        value = _extract_patch_value(proposal.proposed_patch, proposal.target_field)
        if value is None:
            return SemanticResolution(
                proposal=None,
                clarification_message=_localized_invalid_value_message(proposal.response_language, proposal.target_field),
            )

        if proposal.target_field in LIST_FIELD_TARGETS:
            if not isinstance(value, list) or not value or len(value) > 8:
                return SemanticResolution(
                    proposal=None,
                    clarification_message=_localized_invalid_value_message(proposal.response_language, proposal.target_field),
                )
            if any(not _is_valid_semantic_list_label(str(item), proposal.target_field) for item in value):
                return SemanticResolution(
                    proposal=None,
                    clarification_message=_localized_invalid_value_message(proposal.response_language, proposal.target_field),
                )
            return SemanticResolution(
                proposal=SemanticIntentProposal(
                    **{**proposal.__dict__, "proposed_patch": _build_patch_for_target(proposal.target_field, value)}
                )
            )

        if proposal.target_field == "ai_understanding.summary":
            if not isinstance(value, str):
                return SemanticResolution(
                    proposal=None,
                    clarification_message=_localized_invalid_value_message(proposal.response_language, proposal.target_field),
                )
            clean = value.strip()
            if not clean or _looks_like_json_or_code(clean):
                return SemanticResolution(
                    proposal=None,
                    clarification_message=_localized_invalid_value_message(proposal.response_language, proposal.target_field),
                )
            return SemanticResolution(
                proposal=SemanticIntentProposal(
                    **{**proposal.__dict__, "proposed_patch": _build_patch_for_target(proposal.target_field, clean)}
                )
            )

        if not isinstance(value, str):
            return SemanticResolution(
                proposal=None,
                clarification_message=_localized_invalid_value_message(proposal.response_language, proposal.target_field),
            )
        clean_scalar = value.strip()
        if not clean_scalar or _looks_like_command_phrase(clean_scalar):
            return SemanticResolution(
                proposal=None,
                clarification_message=_localized_invalid_value_message(proposal.response_language, proposal.target_field),
            )
        return SemanticResolution(
            proposal=SemanticIntentProposal(
                **{**proposal.__dict__, "proposed_patch": _build_patch_for_target(proposal.target_field, clean_scalar)}
            )
        )

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

    async def _build_apply_result(
        self,
        *,
        pending: PendingSemanticAction,
        request_headers: Mapping[str, str],
        response_language: str,
    ) -> ToolExecutionResult:
        applied = await self._apply_semantic_patch(
            ingestion_id=pending.ingestion_id,
            reason=pending.reason,
            patch=pending.proposed_patch,
            if_match=pending.base_version,
            request_headers=request_headers,
        )
        semantic = applied.get("semantic") if isinstance(applied.get("semantic"), dict) else {}
        response_text = _render_apply_response(
            language=response_language,
            target_field=pending.target_field,
            semantic=semantic if semantic else pending.proposed_patch,
        )
        metadata = {
            "tool": "apply_semantic_patch",
            "persisted": True,
            "response_language": response_language,
            "target_field": pending.target_field,
            "intent_type": pending.intent_type,
            "proposal_summary": pending.proposal_summary,
            "requires_confirmation": False,
            "confidence": pending.confidence,
            "source": pending.source,
            "semantic": semantic,
            "client_actions": [
                {
                    "type": "merge_overview_semantic",
                    "ingestion_id": pending.ingestion_id,
                    "semantic": semantic,
                }
            ],
        }
        return ToolExecutionResult(
            tool_name="apply_semantic_patch",
            sources=["tool:apply_semantic_patch"],
            llm_context=json.dumps({"status": "applied", "response_text": response_text}, ensure_ascii=False),
            metadata=metadata,
            response_text=response_text,
            direct_response=True,
        )

    def _build_preview_result(
        self,
        *,
        pending_action: PendingSemanticAction,
        semantic_preview: dict[str, object],
    ) -> ToolExecutionResult:
        response_text = _render_preview_response(
            language=pending_action.response_language,
            target_field=pending_action.target_field,
            patch=pending_action.proposed_patch,
        )
        metadata = {
            "tool": "preview_semantic_patch",
            "persisted": False,
            "response_language": pending_action.response_language,
            "target_field": pending_action.target_field,
            "intent_type": pending_action.intent_type,
            "proposal_summary": pending_action.proposal_summary,
            "requires_confirmation": pending_action.requires_confirmation,
            "confidence": pending_action.confidence,
            "source": pending_action.source,
            "patch": pending_action.proposed_patch,
            "reason": pending_action.reason,
            "base_version": pending_action.base_version,
            "ingestion_id": pending_action.ingestion_id,
            "semantic_preview": semantic_preview,
        }
        return ToolExecutionResult(
            tool_name="preview_semantic_patch",
            sources=["tool:preview_semantic_patch"],
            llm_context=json.dumps({"status": "previewed", "response_text": response_text}, ensure_ascii=False),
            metadata=metadata,
            response_text=response_text,
            direct_response=True,
        )

    def _build_pending_preview_reminder_result(
        self,
        *,
        pending: PendingSemanticAction,
        language: str,
    ) -> ToolExecutionResult:
        response_text = _render_pending_preview_reminder(
            language=language,
            target_field=pending.target_field,
            patch=pending.proposed_patch,
        )
        metadata = {
            "tool": "preview_semantic_patch",
            "persisted": False,
            "response_language": pending.response_language,
            "target_field": pending.target_field,
            "intent_type": pending.intent_type,
            "proposal_summary": pending.proposal_summary,
            "requires_confirmation": pending.requires_confirmation,
            "confidence": pending.confidence,
            "source": pending.source,
            "patch": pending.proposed_patch,
            "reason": pending.reason,
            "base_version": pending.base_version,
            "ingestion_id": pending.ingestion_id,
        }
        return ToolExecutionResult(
            tool_name="preview_semantic_patch",
            sources=["tool:preview_semantic_patch"],
            llm_context=json.dumps({"status": "previewed", "response_text": response_text}, ensure_ascii=False),
            metadata=metadata,
            response_text=response_text,
            direct_response=True,
        )

    def _build_cancel_result(self, language: str) -> ToolExecutionResult:
        response_text = _render_cancel_response(language)
        return ToolExecutionResult(
            tool_name="cancel_pending_semantic_patch",
            sources=["tool:cancel_pending_semantic_patch"],
            llm_context=json.dumps({"status": "canceled", "response_text": response_text}, ensure_ascii=False),
            metadata={
                "tool": "cancel_pending_semantic_patch",
                "persisted": False,
                "response_language": language,
                "requires_confirmation": False,
            },
            response_text=response_text,
            direct_response=True,
        )

    def _build_clarification_result(self, *, language: str, message_text: str) -> ToolExecutionResult:
        return ToolExecutionResult(
            tool_name="clarify_semantic_patch",
            sources=["tool:clarify_semantic_patch"],
            llm_context=json.dumps({"status": "clarification", "response_text": message_text}, ensure_ascii=False),
            metadata={
                "tool": "clarify_semantic_patch",
                "persisted": False,
                "response_language": language,
                "requires_confirmation": False,
            },
            response_text=message_text,
            direct_response=True,
        )

    def _recover_pending_action(self, history: list[ChatMessage]) -> PendingSemanticAction | None:
        for message in reversed(history):
            if message.role is not ChatRole.ASSISTANT:
                continue
            metadata = message.metadata or {}
            if metadata.get("tool") != "preview_semantic_patch" or metadata.get("persisted") is not False:
                continue
            patch = metadata.get("patch")
            reason = metadata.get("reason")
            ingestion_id = metadata.get("ingestion_id")
            target_field = metadata.get("target_field")
            proposal_summary = metadata.get("proposal_summary")
            if not all(isinstance(value, str) for value in (reason, ingestion_id, target_field, proposal_summary)):
                continue
            if not isinstance(patch, dict):
                continue
            base_version = metadata.get("base_version")
            confidence = metadata.get("confidence")
            return PendingSemanticAction(
                ingestion_id=ingestion_id,
                reason=reason,
                target_field=target_field,
                intent_type=str(metadata.get("intent_type") or _default_intent_for_field(target_field)),
                proposed_patch=patch,
                proposal_summary=proposal_summary,
                response_language=str(metadata.get("response_language") or "en"),
                requires_confirmation=bool(metadata.get("requires_confirmation", True)),
                confidence=float(confidence) if isinstance(confidence, (int, float)) else None,
                source=str(metadata.get("source") or "deterministic"),
                base_version=str(base_version) if base_version else None,
            )
        return None


LIST_FIELD_TARGETS = {
    "dataset_header.tags",
    "terms",
    "business_description.typical_usage",
}

LIST_FIELD_ALIASES = {
    "dataset_header.tags": ("tags", "tag"),
    "terms": ("terms", "termos", "glossary"),
    "business_description.typical_usage": ("typical usage", "usage", "uso tipico", "uso típico"),
}

SCALAR_FIELD_ALIASES = {
    "dataset_header.classification": ("classification", "classificacao", "classificação"),
    "business_description.business_area": ("business area", "area de negocio", "área de negócio", "area do negocio"),
    "business_description.domain": ("domain", "dominio", "domínio"),
    "business_description.data_type": ("data type", "tipo de dado", "tipo do dado"),
}

SUMMARY_FIELD_ALIASES = (
    "ai understanding",
    "ai summary",
    "ai_understanding",
    "sumario da ia",
    "sumário da ia",
    "sumario de ia",
    "sumário de ia",
    "sumario do ai",
    "sumário do ai",
    "resumo da ia",
    "resumo do ai",
    "entendimento da ia",
)


def _resolve_summary_proposal(message: str, lower: str, response_language: str) -> SemanticResolution:
    if not any(alias in lower for alias in SUMMARY_FIELD_ALIASES):
        return SemanticResolution(proposal=None)

    explicit_text = _extract_explicit_summary_text(message)
    if explicit_text:
        proposal = _make_proposal(
            target_field="ai_understanding.summary",
            intent_type="replace",
            value=explicit_text,
            response_language=response_language,
            source="deterministic",
            confidence=0.97,
        )
        return SemanticResolution(proposal=proposal)

    if _contains_any_phrase(
        lower,
        (
            "troca",
            "trocar",
            "muda",
            "altera",
            "atualiza",
            "melhora",
            "reescreve",
            "rewrite",
            "improve",
            "refine",
            "ajusta",
            "reescribe",
        ),
    ):
        return SemanticResolution(proposal=None)

    return SemanticResolution(proposal=None)


def _resolve_list_field_proposal(message: str, lower: str, response_language: str) -> SemanticResolution:
    for target_field, aliases in LIST_FIELD_ALIASES.items():
        if not any(alias in lower for alias in aliases):
            continue
        values = _extract_list_values(message, aliases)
        if values:
            proposal = _make_proposal(
                target_field=target_field,
                intent_type="set_list",
                value=values,
                response_language=response_language,
                source="deterministic",
                confidence=0.95,
            )
            return SemanticResolution(proposal=proposal)
    return SemanticResolution(proposal=None)


def _resolve_scalar_field_proposal(
    message: str,
    lower: str,
    response_language: str,
    overview: dict[str, object],
) -> SemanticResolution:
    correction = _extract_not_x_but_y(lower)
    if correction is not None:
        source, target = correction
        business = overview.get("business_description")
        current_domain = ""
        if isinstance(business, dict):
            current_domain = str(business.get("domain") or "").casefold()
        target_value = _title_case(target)
        target_field = "business_description.domain" if current_domain and source in current_domain else "dataset_header.classification"
        proposal = _make_proposal(
            target_field=target_field,
            intent_type="replace",
            value=target_value,
            response_language=response_language,
            source="deterministic",
            confidence=0.93,
        )
        return SemanticResolution(proposal=proposal)

    for target_field, aliases in SCALAR_FIELD_ALIASES.items():
        if not any(alias in lower for alias in aliases):
            continue
        explicit_value = _extract_explicit_field_value(message, aliases)
        if explicit_value:
            proposal = _make_proposal(
                target_field=target_field,
                intent_type="replace",
                value=explicit_value,
                response_language=response_language,
                source="deterministic",
                confidence=0.94,
            )
            return SemanticResolution(proposal=proposal)
    return SemanticResolution(proposal=None)


def _extract_not_x_but_y(message: str) -> tuple[str, str] | None:
    compact = " ".join(message.split())
    markers = [
        ("nao e de ", " e de "),
        ("não é de ", " é de "),
        ("not ", " but "),
        ("no es ", " es "),
    ]
    for prefix, middle in markers:
        if prefix not in compact or middle not in compact:
            continue
        _, after_prefix = compact.split(prefix, 1)
        if middle not in after_prefix:
            continue
        source, target = after_prefix.split(middle, 1)
        source_clean = source.strip(" .,!?:;")
        target_clean = target.strip(" .,!?:;")
        if source_clean and target_clean:
            return (source_clean, target_clean)
    return None


def _make_proposal(
    *,
    target_field: str,
    intent_type: Literal["replace", "rewrite", "set_list", "merge_list", "remove_from_list", "suggest"],
    value: str | list[str],
    response_language: str,
    source: Literal["deterministic", "llm"],
    confidence: float | None,
) -> SemanticIntentProposal:
    patch = _build_patch_for_target(target_field, value)
    return SemanticIntentProposal(
        target_field=target_field,
        intent_type=intent_type,
        proposed_patch=patch,
        proposal_summary=_build_proposal_summary(target_field, patch, response_language),
        response_language=response_language,
        requires_confirmation=True,
        confidence=confidence,
        source=source,
    )


def _build_patch_for_target(target_field: str, value: str | list[str]) -> dict[str, object]:
    root, _, leaf = target_field.partition(".")
    if root == "terms":
        return {"terms": value}
    return {root: {leaf: value}}


def _extract_patch_value(patch: dict[str, object], target_field: str) -> object | None:
    root, _, leaf = target_field.partition(".")
    if root == "terms":
        return patch.get("terms")
    node = patch.get(root)
    if not isinstance(node, dict):
        return None
    return node.get(leaf)


def _extract_explicit_summary_text(message: str) -> str | None:
    compact = " ".join(message.split())
    patterns = [
        r"(?i)(?:ai understanding|ai summary|ai_understanding|sum[aá]rio da ia|sum[aá]rio de ia|sum[aá]rio do ai|resumo da ia|resumo do ai|entendimento da ia)\s*(?:para|to|como|:|=)\s*(.+)$",
        r"(?i)(?:troca|trocar|muda|altera|atualiza)\s+(?:o|a)?\s*(?:ai understanding|ai summary|sum[aá]rio da ia|sum[aá]rio de ia|sum[aá]rio do ai|resumo da ia|resumo do ai)\s*(?:para|to|como)\s*(.+)$",
    ]
    for pattern in patterns:
        match = re.search(pattern, compact)
        if match:
            return match.group(1).strip(" .")
    return None


def _extract_explicit_field_value(message: str, aliases: tuple[str, ...]) -> str | None:
    compact = " ".join(message.split())
    for alias in aliases:
        pattern = rf"(?i){re.escape(alias)}\s*(?:para|to|como|:|=|é|e|is)\s*(.+)$"
        match = re.search(pattern, compact)
        if match:
            return _title_case(match.group(1).strip(" .,!?:;"))
    return None


def _extract_list_values(message: str, aliases: tuple[str, ...]) -> list[str]:
    compact = " ".join(message.split())
    for alias in aliases:
        pattern = rf"(?i){re.escape(alias)}\s*(?:para|to|como|:|=)\s*(.+)$"
        match = re.search(pattern, compact)
        if match:
            return _extract_csv_values(match.group(1))
    return _extract_csv_values(message) if any(alias in compact.casefold() for alias in aliases) else []


def _extract_csv_values(raw_message: str) -> list[str]:
    compact = " ".join(raw_message.split())
    if ":" in compact:
        raw = compact.split(":", 1)[1]
    elif "=" in compact:
        raw = compact.split("=", 1)[1]
    else:
        raw = compact
        assignment_markers = list(
            re.finditer(
                r"\b(?:para|to|as|como|formatar|format|formatear|definir|define|setar|set|usar|use|utilizar)\b",
                raw,
                flags=re.IGNORECASE,
            )
        )
        if assignment_markers:
            raw = raw[assignment_markers[-1].end() :]
    values = [
        _normalize_semantic_label(part.strip(" .,!?:;"))
        for part in re.split(r"\s*(?:[,;]|\s+(?:e|y|and)\s+)\s*", raw)
    ]
    deduped: list[str] = []
    seen: set[str] = set()
    for value in values:
        if not value:
            continue
        key = value.casefold()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(value)
    return deduped


def _normalize_semantic_label(value: str) -> str | None:
    clean = re.sub(
        r"^(?:oi|ola|olá|por favor|pfv|vamos|quero|queria|preciso|pode|me ajuda(?:r)? a|ajuda a)\s+",
        "",
        value.strip(),
        flags=re.IGNORECASE,
    ).strip()
    clean = re.sub(
        r"^(?:trocar|mudar|alterar|atualizar|ajustar|formatar|cambiar|actualizar|formatear|definir|setar|usar)\s+",
        "",
        clean,
        flags=re.IGNORECASE,
    ).strip()
    clean = re.sub(
        r"^(?:o|a|os|as|el|la|los|las)?\s*(?:typical\s+usage|usage|tags?|terms?|termos|glossary|uso\s+t[ií]pico|uso|business\s+description)\s*",
        "",
        clean,
        flags=re.IGNORECASE,
    ).strip(" .,!?:;-")
    if not clean:
        return None
    if _looks_like_command_phrase(clean):
        return None
    return _title_case(clean)


def _title_case(value: str) -> str:
    normalized = value.casefold()
    semantic_labels = {
        "analise de cliente": "Análise de Cliente",
        "análise de cliente": "Análise de Cliente",
        "analisis de cliente": "Análisis de Cliente",
        "análisis de cliente": "Análisis de Cliente",
        "crm": "CRM",
        "olist": "OLIST",
        "logistica": "Logística",
        "logística": "Logística",
        "segmentacao": "Segmentação",
        "segmentação": "Segmentação",
    }
    if normalized in semantic_labels:
        return semantic_labels[normalized]
    if value.isupper() and len(value) > 1:
        return value
    return " ".join(part.capitalize() for part in value.split())


def _is_affirmative_confirmation(message: str) -> bool:
    return _contains_any_phrase(
        message,
        (
            "confirm",
            "confirmar",
            "apply",
            "save",
            "persist",
            "aplica",
            "aplicar",
            "salva",
            "salvar",
            "guardar",
            "guarda",
            "pode aplicar",
            "pode salvar",
            "pode seguir",
            "puede aplicar",
            "puede guardar",
            "adelante",
            "seguir",
            "sim",
            "sí",
            "si",
            "yes",
            "ok",
            "vale",
        ),
    )


def _is_negative_confirmation(message: str) -> bool:
    return _contains_any_phrase(
        message,
        ("cancel", "cancelar", "cancela", "nao", "não", "no", "deixa", "dejar"),
    )


def _contains_any_phrase(message: str, phrases: tuple[str, ...]) -> bool:
    compact = " ".join(message.casefold().split())
    for phrase in phrases:
        escaped = re.escape(phrase.casefold())
        if re.search(rf"(?<!\w){escaped}(?!\w)", compact):
            return True
    return False


def _detect_user_language(message: str, history: list[ChatMessage]) -> str:
    explicit_message = message.strip()
    is_confirmation = _is_affirmative_confirmation(explicit_message.casefold()) or _is_negative_confirmation(
        explicit_message.casefold()
    )
    if is_confirmation:
        for item in reversed(history[-6:]):
            if item.role is ChatRole.USER:
                return _detect_language_from_text(item.content)
    detected = _detect_language_from_text(explicit_message)
    if detected != "en":
        return detected
    for item in reversed(history[-6:]):
        if item.role is ChatRole.USER:
            detected = _detect_language_from_text(item.content)
            if detected != "en":
                return detected
    return detected


def _detect_language_from_text(text: str) -> str:
    lower = text.casefold()
    scores = {
        "pt-BR": _language_score(
            lower,
            (
                "ção",
                "ções",
                "não",
                "olá",
                "você",
                "vamos",
                "trocar",
                "ajuda",
                "formatar",
                "pode",
                "salvar",
                "aplicar",
                "análise",
                "cliente",
                "vendas",
            ),
        ),
        "es": _language_score(
            lower,
            (
                "ción",
                "ciones",
                "hola",
                "vamos",
                "cambiar",
                "ayuda",
                "ayúdame",
                "formatear",
                "puede",
                "guardar",
                "aplicar",
                "análisis",
                "cliente",
                "ventas",
                "sí",
            ),
        ),
        "en": _language_score(
            lower,
            (
                "hello",
                "hi",
                "change",
                "update",
                "help",
                "format",
                "confirm",
                "apply",
                "save",
                "customer",
                "sales",
                "usage",
            ),
        ),
    }
    return max(scores, key=scores.get) if max(scores.values()) > 0 else "en"


def _language_score(text: str, markers: tuple[str, ...]) -> int:
    return sum(1 for marker in markers if re.search(rf"(?<!\w){re.escape(marker)}(?!\w)", text))


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
            "troca",
            "trocar",
            "update",
            "change",
            "cambiar",
            "tag",
            "termo",
            "terms",
            "usage",
            "dominio",
            "domínio",
            "domain",
            "business area",
            "area de negocio",
            "área de negócio",
            "tipo de dado",
            "summary",
            "sumario",
            "sumário",
            "resumo",
            "resumen",
            "descrição",
            "descricao",
            "descripción",
            "description",
            "ai summary",
            "ai understanding",
            "reescrev",
            "refinar",
            "rewrite",
            "rephrase",
            "reescribir",
            "executivo",
            "executive",
            "ejecutivo",
            "tecnico",
            "técnico",
            "technical",
            "curto",
            "short",
            "corto",
            "claro",
            "clear",
        )
    )


def _serialize_recent_history(history: list[ChatMessage]) -> list[dict[str, str]]:
    serialized: list[dict[str, str]] = []
    for message in history[-6:]:
        if message.role not in (ChatRole.USER, ChatRole.ASSISTANT):
            continue
        serialized.append({"role": message.role.value, "content": message.content})
    return serialized


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


def _infer_target_field_from_patch(patch: dict[str, object]) -> str | None:
    if "terms" in patch:
        return "terms"
    for root, value in patch.items():
        if not isinstance(value, dict):
            continue
        for leaf in value:
            return f"{root}.{leaf}"
    return None


def _default_intent_for_field(target_field: str) -> str:
    if target_field == "ai_understanding.summary":
        return "rewrite"
    if target_field in LIST_FIELD_TARGETS:
        return "set_list"
    return "replace"


def _normalize_intent_type(intent_type: str) -> Literal["replace", "rewrite", "set_list", "merge_list", "remove_from_list", "suggest"]:
    normalized = intent_type.strip().casefold()
    if normalized in {"replace", "rewrite", "set_list", "merge_list", "remove_from_list", "suggest"}:
        return normalized  # type: ignore[return-value]
    return "suggest"


def _build_proposal_summary(target_field: str, patch: dict[str, object], language: str) -> str:
    value = _extract_patch_value(patch, target_field)
    label = _localized_field_label(language, target_field)
    if isinstance(value, list):
        return _localized_list_summary(language, label, value)
    if target_field == "ai_understanding.summary" and isinstance(value, str):
        return _localized_summary_summary(language, value)
    if isinstance(value, str):
        return _localized_scalar_summary(language, label, value)
    return _localized_generic_summary(language, label)


def _render_preview_response(language: str, target_field: str, patch: dict[str, object]) -> str:
    value = _extract_patch_value(patch, target_field)
    label = _localized_field_label(language, target_field)
    if target_field == "ai_understanding.summary" and isinstance(value, str):
        return _localized_summary_preview(language, value)
    if isinstance(value, list):
        return _localized_list_preview(language, label, value)
    if isinstance(value, str):
        return _localized_scalar_preview(language, label, value)
    return _localized_generic_preview(language, label)


def _render_pending_preview_reminder(language: str, target_field: str, patch: dict[str, object]) -> str:
    value = _extract_patch_value(patch, target_field)
    label = _localized_field_label(language, target_field)
    if target_field == "ai_understanding.summary" and isinstance(value, str):
        if language == "pt-BR":
            return f'A proposta atual para o {label} é: "{value}". Quer aplicar ou salvar essa alteração?'
        if language == "es":
            return f'La propuesta actual para el {label} es: "{value}". ¿Quieres aplicar o guardar este cambio?'
        return f'The current proposal for the {label} is: "{value}". Do you want to apply or save this change?'
    return _render_preview_response(language, target_field, patch)


def _render_apply_response(language: str, target_field: str, semantic: dict[str, object]) -> str:
    value = _extract_patch_value(semantic, target_field)
    label = _localized_field_label(language, target_field)
    if target_field == "ai_understanding.summary" and isinstance(value, str):
        return _localized_summary_apply(language, value)
    if isinstance(value, list):
        return _localized_list_apply(language, label, value)
    if isinstance(value, str):
        return _localized_scalar_apply(language, label, value)
    return _localized_generic_apply(language, label)


def _render_cancel_response(language: str) -> str:
    if language == "pt-BR":
        return "Tudo certo, não apliquei nenhuma alteração semântica."
    if language == "es":
        return "Todo bien, no apliqué ningún cambio semántico."
    return "No problem, I did not apply any semantic change."


def _localized_invalid_value_message(language: str, target_field: str) -> str:
    label = _localized_field_label(language, target_field)
    if language == "pt-BR":
        return f"Não consegui montar um valor válido para {label}. Me diga a lista ou o texto final que você quer aplicar."
    if language == "es":
        return f"No pude montar un valor válido para {label}. Dime la lista o el texto final que quieres aplicar."
    return f"I could not build a valid value for {label}. Tell me the final list or final text you want to apply."


def _localized_clarification_for_unresolved_intent(language: str) -> str:
    if language == "pt-BR":
        return "Entendi que você quer ajustar a interpretação semântica, mas ainda não consegui montar uma proposta confiável. Me diga o texto final ou a lista final que você quer aplicar."
    if language == "es":
        return "Entendí que quieres ajustar la interpretación semántica, pero todavía no pude montar una propuesta confiable. Dime el texto final o la lista final que quieres aplicar."
    return "I understand that you want to adjust the semantic interpretation, but I could not build a reliable proposal yet. Tell me the final text or final list you want to apply."


def _localized_unsupported_field_message(language: str, field: str) -> str:
    if field == "dataset_header.name":
        if language == "pt-BR":
            return (
                "Hoje eu não consigo alterar o nome do dataset por esse fluxo semântico. "
                "Aqui eu posso refinar campos como classificação, tags, AI Summary, business area, domain, "
                "data type, typical usage e terms."
            )
        if language == "es":
            return (
                "Hoy no puedo cambiar el nombre del dataset por este flujo semántico. "
                "Aquí sí puedo refinar campos como clasificación, etiquetas, AI Summary, business area, domain, "
                "data type, typical usage y terms."
            )
        return (
            "I can't change the dataset name through this semantic editing flow right now. "
            "Here I can refine fields like classification, tags, AI Summary, business area, domain, "
            "data type, typical usage, and terms."
        )
    return _localized_clarification_for_unresolved_intent(language)


def _localized_field_label(language: str, target_field: str) -> str:
    labels = {
        "dataset_header.classification": {
            "pt-BR": "a classificação",
            "es": "la clasificación",
            "en": "the classification",
        },
        "dataset_header.tags": {
            "pt-BR": "as tags",
            "es": "las etiquetas",
            "en": "the tags",
        },
        "ai_understanding.summary": {
            "pt-BR": "o AI Summary",
            "es": "el AI Summary",
            "en": "the AI Summary",
        },
        "business_description.business_area": {
            "pt-BR": "a área de negócio",
            "es": "el área de negocio",
            "en": "the business area",
        },
        "business_description.domain": {
            "pt-BR": "o domínio",
            "es": "el dominio",
            "en": "the domain",
        },
        "business_description.data_type": {
            "pt-BR": "o tipo de dado",
            "es": "el tipo de dato",
            "en": "the data type",
        },
        "business_description.typical_usage": {
            "pt-BR": "o uso típico",
            "es": "el uso típico",
            "en": "the typical usage",
        },
        "terms": {
            "pt-BR": "os termos",
            "es": "los términos",
            "en": "the terms",
        },
    }
    return labels.get(target_field, {}).get(language, labels.get(target_field, {}).get("en", target_field))


def _localized_list_summary(language: str, label: str, values: list[str]) -> str:
    if language == "pt-BR":
        return f"Atualizar {label} para {_join_localized_list(values, language)}"
    if language == "es":
        return f"Actualizar {label} a {_join_localized_list(values, language)}"
    return f"Update {label} to {_join_localized_list(values, language)}"


def _localized_scalar_summary(language: str, label: str, value: str) -> str:
    if language == "pt-BR":
        return f"Atualizar {label} para {value}"
    if language == "es":
        return f"Actualizar {label} a {value}"
    return f"Update {label} to {value}"


def _localized_summary_summary(language: str, value: str) -> str:
    if language == "pt-BR":
        return f"Atualizar o AI Summary para refletir: {value}"
    if language == "es":
        return f"Actualizar el AI Summary para reflejar: {value}"
    return f"Update the AI Summary to reflect: {value}"


def _localized_generic_summary(language: str, label: str) -> str:
    if language == "pt-BR":
        return f"Atualizar {label}"
    if language == "es":
        return f"Actualizar {label}"
    return f"Update {label}"


def _localized_list_preview(language: str, label: str, values: list[str]) -> str:
    joined = _join_localized_list(values, language)
    if language == "pt-BR":
        return f"Posso atualizar {label} para {joined}. Quer aplicar ou salvar essa alteração?"
    if language == "es":
        return f"Puedo actualizar {label} a {joined}. ¿Quieres aplicar o guardar este cambio?"
    return f"I can update {label} to {joined}. Do you want to apply or save this change?"


def _localized_scalar_preview(language: str, label: str, value: str) -> str:
    if language == "pt-BR":
        return f"Posso atualizar {label} para {value}. Quer aplicar ou salvar essa alteração?"
    if language == "es":
        return f"Puedo actualizar {label} a {value}. ¿Quieres aplicar o guardar este cambio?"
    return f"I can update {label} to {value}. Do you want to apply or save this change?"


def _localized_summary_preview(language: str, value: str) -> str:
    if language == "pt-BR":
        return f'Posso atualizar o AI Summary para refletir: "{value}". Quer aplicar ou salvar essa alteração?'
    if language == "es":
        return f'Puedo actualizar el AI Summary para reflejar: "{value}". ¿Quieres aplicar o guardar este cambio?'
    return f'I can update the AI Summary to reflect: "{value}". Do you want to apply or save this change?'


def _localized_generic_preview(language: str, label: str) -> str:
    if language == "pt-BR":
        return f"Posso atualizar {label}. Quer aplicar ou salvar essa alteração?"
    if language == "es":
        return f"Puedo actualizar {label}. ¿Quieres aplicar o guardar este cambio?"
    return f"I can update {label}. Do you want to apply or save this change?"


def _localized_list_apply(language: str, label: str, values: list[str]) -> str:
    joined = _join_localized_list(values, language)
    if language == "pt-BR":
        return f"Atualizei {label} para {joined}. Os fatos técnicos do dataset não foram alterados."
    if language == "es":
        return f"Actualicé {label} a {joined}. Los hechos técnicos del dataset no cambiaron."
    return f"I updated {label} to {joined}. The dataset technical facts were not changed."


def _localized_scalar_apply(language: str, label: str, value: str) -> str:
    if language == "pt-BR":
        return f"Atualizei {label} para {value}. Os fatos técnicos do dataset não foram alterados."
    if language == "es":
        return f"Actualicé {label} a {value}. Los hechos técnicos del dataset no cambiaron."
    return f"I updated {label} to {value}. The dataset technical facts were not changed."


def _localized_summary_apply(language: str, value: str) -> str:
    if language == "pt-BR":
        return f'Atualizei o AI Summary para refletir: "{value}". Os fatos técnicos do dataset não foram alterados.'
    if language == "es":
        return f'Actualicé el AI Summary para reflejar: "{value}". Los hechos técnicos del dataset no cambiaron.'
    return f'I updated the AI Summary to reflect: "{value}". The dataset technical facts were not changed.'


def _localized_generic_apply(language: str, label: str) -> str:
    if language == "pt-BR":
        return f"Atualizei {label}. Os fatos técnicos do dataset não foram alterados."
    if language == "es":
        return f"Actualicé {label}. Los hechos técnicos del dataset no cambiaron."
    return f"I updated {label}. The dataset technical facts were not changed."


def _join_localized_list(values: list[str], language: str) -> str:
    if not values:
        return ""
    if len(values) == 1:
        return values[0]
    conjunction = {"pt-BR": "e", "es": "y", "en": "and"}.get(language, "and")
    if len(values) == 2:
        return f"{values[0]} {conjunction} {values[1]}"
    return f"{', '.join(values[:-1])} {conjunction} {values[-1]}"


def _looks_like_json_or_code(value: str) -> bool:
    compact = value.strip()
    return compact.startswith("{") or compact.startswith("[") or "```" in compact or '"patch"' in compact


def _looks_like_command_phrase(value: str) -> bool:
    lower = value.casefold()
    command_tokens = (
        "ajuda",
        "alterar",
        "atualizar",
        "business description",
        "formatar",
        "formatear",
        "mudar",
        "trocar",
        "usage",
        "uso tipico",
        "uso típico",
        "tags",
        "terms",
        "vamos",
    )
    return any(token in lower for token in command_tokens)


def _looks_like_pending_preview_clarification(message: str) -> bool:
    compact = " ".join(message.casefold().split())
    clarification_markers = (
        "isso altera para",
        "isso muda para",
        "isso fica como",
        "vai ficar como",
        "vai ficar assim",
        "entao fica",
        "então fica",
        "isso quer dizer",
        "this changes to",
        "this becomes",
        "so it becomes",
        "esto cambia a",
        "esto queda como",
        "entonces queda",
    )
    return any(marker in compact for marker in clarification_markers)


def _detect_unsupported_semantic_edit(message: str) -> str | None:
    compact = " ".join(message.casefold().split())
    edit_markers = (
        "troca",
        "trocar",
        "muda",
        "mudar",
        "altera",
        "alterar",
        "atualiza",
        "atualizar",
        "change",
        "update",
        "rename",
        "cambia",
        "cambiar",
        "actualiza",
        "actualizar",
    )
    if not any(marker in compact for marker in edit_markers):
        return None
    if any(alias in compact for alias in ("nome do dataset", "nome desse dataset", "dataset name", "nombre del dataset")):
        return "dataset_header.name"
    return None


def _looks_like_terms_meaning_question(message: str) -> bool:
    compact = " ".join(message.casefold().split())
    terms_markers = (
        "key business terms",
        "business terms",
        "termos de negocio",
        "termos de negócio",
        "glossary",
        "terms",
        "termos",
    )
    meaning_markers = (
        "o que eles significam",
        "o que significam",
        "o que isso significa",
        "what do they mean",
        "what does that mean",
        "what do these terms mean",
        "que significan",
        "qué significan",
        "que significa",
        "qué significa",
        "business meaning",
    )
    return any(term in compact for term in terms_markers) and any(marker in compact for marker in meaning_markers)


def _is_valid_semantic_list_label(value: str, target_field: str) -> bool:
    lower = value.casefold()
    invalid_exact = {
        "dataset_header.tags": {"tag", "tags"},
        "terms": {"term", "terms", "termo", "termos"},
        "business_description.typical_usage": {"usage", "typical usage", "uso tipico", "uso típico"},
    }
    if lower in invalid_exact.get(target_field, set()):
        return False
    return not _looks_like_command_phrase(value)


def _validate_sql_query(sql: str, bq_table: str, tenant_id: str) -> bool:
    sql_clean = sql.strip().casefold()
    if not (sql_clean.startswith("select") or sql_clean.startswith("with")):
        return False
    forbidden = {"insert", "update", "delete", "drop", "alter", "create", "truncate", "merge", "grant", "revoke", "replace"}
    for kw in forbidden:
        if re.search(r"\b" + kw + r"\b", sql_clean):
            return False
    expected_dataset = f"silver__{tenant_id.replace('-', '_')}".casefold()
    normalized_bq_table = bq_table.casefold().replace("`", "")
    if expected_dataset not in normalized_bq_table:
        return False
    table_refs = re.findall(r"\b(?:from|join)\s+([`a-zA-Z0-9_\.\-]+)", sql_clean)
    for ref in table_refs:
        ref_clean = ref.replace("`", "").strip()
        if "." in ref_clean:
            if ref_clean != normalized_bq_table:
                return False
        else:
            parts = normalized_bq_table.split(".")
            short_name = parts[-1]
            if ref_clean != short_name and ref_clean != normalized_bq_table:
                if f"with {ref_clean}" not in sql_clean and f"{ref_clean} as (" not in sql_clean:
                    return False
    return True

