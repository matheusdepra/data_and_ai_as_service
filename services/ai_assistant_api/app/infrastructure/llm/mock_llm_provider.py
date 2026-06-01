from __future__ import annotations

import json

from app.domain.models.chat import ChatMessage, ChatRole, LLMResponse


class MockLLMProvider:
    async def generate(self, messages: list[ChatMessage]) -> LLMResponse:
        latest_user_message = next((message for message in reversed(messages) if message.role == ChatRole.USER), None)
        latest_tool_message = next((message for message in reversed(messages) if message.role == ChatRole.TOOL), None)
        system_message = next((message for message in messages if message.role == ChatRole.SYSTEM), None)
        user_text = latest_user_message.content if latest_user_message else ""
        system_text = system_message.content if system_message else ""

        if "strict classifier for semantic metadata edits" in system_text.lower():
            return LLMResponse(
                content=_semantic_patch_json_response(user_text),
                model="mock-llm",
                metadata={"provider": "mock"},
            )

        if latest_tool_message is not None:
            return LLMResponse(
                content=_tool_aware_response(user_text, latest_tool_message.content),
                model="mock-llm",
                metadata={"provider": "mock"},
            )

        context = _extract_context(system_text)
        if context:
            return LLMResponse(
                content=_answer_from_dataset_overview_context(user_text, context),
                model="mock-llm",
                metadata={"provider": "mock"},
            )
        return LLMResponse(
            content=(
                "Mock answer: I received your question and assembled the prompt with explicit context. "
                f"Question: {user_text}"
            ),
            model="mock-llm",
            metadata={"provider": "mock"},
        )


def _semantic_patch_json_response(user_text: str) -> str:
    lower = user_text.casefold()
    if "oi" == lower.strip() or "hello" == lower.strip():
        return json.dumps({"should_patch": False, "reason": "greeting", "patch": {}}, ensure_ascii=False)
    if "nao e de crm e de marketing" in lower or "não é de crm é de marketing" in lower:
        return json.dumps(
            {
                "should_patch": True,
                "reason": "The user corrected the business domain from CRM to Marketing.",
                "patch": {"business_description": {"domain": "Marketing"}},
            },
            ensure_ascii=False,
        )
    return json.dumps({"should_patch": False, "reason": "no semantic patch inferred", "patch": {}}, ensure_ascii=False)


def _tool_aware_response(user_text: str, tool_content: str) -> str:
    parsed = _extract_json_object(tool_content)
    if not parsed:
        return "I executed an internal tool for this request, but I could not format the result cleanly."
    status = parsed.get("status")
    if status == "previewed":
        return (
            f"I prepared a semantic refinement proposal based on your request. {parsed.get('summary', '')} "
            "If this looks right, reply with 'confirm', 'apply' or 'save' and I will persist the change."
        ).strip()
    if status == "applied":
        return (
            f"I persisted the semantic update successfully. {parsed.get('summary', '')} "
            "Only the business interpretation changed; technical facts like rows, schema and quality metrics stayed the same."
        ).strip()
    if status == "canceled":
        return str(parsed.get("message") or "I canceled the pending semantic change.")
    return f"I used an internal tool to help with '{user_text}'."


def _extract_context(system_prompt: str) -> dict[str, object] | None:
    marker = "context:\n"
    lower = system_prompt.lower()
    idx = lower.find(marker)
    if idx < 0:
        return None
    raw = system_prompt[idx + len(marker) :].strip()
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def _answer_from_dataset_overview_context(user_text: str, context: dict[str, object]) -> str:
    normalized = user_text.lower()
    dataset_header = _as_dict(context.get("dataset_header"))
    business = _as_dict(context.get("business_description"))
    quality = _as_dict(context.get("quality"))
    ai_understanding = _as_dict(context.get("ai_understanding"))
    semantic_overlay = _as_dict(context.get("semantic_overlay"))
    summary = _as_dict(context.get("summary"))
    terms = _as_list(context.get("terms"))
    relationships = _as_list(context.get("relationships"))

    dataset_name = str(dataset_header.get("name") or context.get("collection_slug") or "this dataset")
    classification = str(dataset_header.get("classification") or "not classified yet")
    business_area = str(business.get("business_area") or "unknown business area")
    domain = str(business.get("domain") or "unknown domain")

    if any(term in normalized for term in ("quality", "warning", "issue", "problem", "qualidade")):
        overall = _percent(quality.get("overall_score"))
        completeness = _percent(quality.get("completeness"))
        uniqueness = _percent(quality.get("uniqueness"))
        validity = _percent(quality.get("validity"))
        return (
            f"{dataset_name} is currently framed with overall quality at {overall}. "
            f"The main quality dimensions available here are completeness {completeness}, uniqueness {uniqueness} and validity {validity}. "
            "This screen can explain the current quality posture, but it does not change those technical scores."
        )

    if any(term in normalized for term in ("term", "glossary", "meaning", "campo", "column", "schema")):
        joined_terms = ", ".join(str(term) for term in terms[:6]) or "no extracted business terms yet"
        return (
            f"{dataset_name} is currently interpreted for {business_area} in the {domain} domain. "
            f"The most relevant extracted business terms so far are: {joined_terms}."
        )

    if any(term in normalized for term in ("relationship", "join", "related", "lineage", "relacion")):
        if relationships:
            first = _as_dict(relationships[0])
            related_name = str(first.get("dataset_name") or first.get("collection_slug") or "another dataset")
            shared = ", ".join(first.get("shared_columns") or []) if isinstance(first.get("shared_columns"), list) else ""
            return (
                f"{dataset_name} already has at least one inferred relationship with {related_name}. "
                f"The strongest current hint comes from shared columns such as {shared or 'the detected join keys'}."
            )
        return f"No strong cross-dataset relationship has been inferred yet for {dataset_name} in the current overview."

    if any(term in normalized for term in ("row", "count", "size", "how many", "quant")):
        rows = summary.get("rows")
        columns = summary.get("columns")
        return (
            f"{dataset_name} currently shows {rows if rows is not None else 'unknown'} rows and "
            f"{columns if columns is not None else 'unknown'} columns in the overview context."
        )

    understanding = str(ai_understanding.get("summary") or "")
    overlay_understanding = semantic_overlay.get("ai_understanding")
    if isinstance(overlay_understanding, dict) and overlay_understanding.get("summary"):
        understanding = str(overlay_understanding["summary"])
    if understanding:
        return understanding
    return f"{dataset_name} is currently classified as {classification} for the {business_area} area."


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


def _as_dict(value: object) -> dict[str, object]:
    return value if isinstance(value, dict) else {}


def _as_list(value: object) -> list[object]:
    return value if isinstance(value, list) else []


def _percent(value: object) -> str:
    if isinstance(value, (int, float)):
        return f"{round(value * 100)}%"
    return "unknown"
