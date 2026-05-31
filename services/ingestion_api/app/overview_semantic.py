from __future__ import annotations

from typing import Any


_ALLOWLIST: dict[str, Any] = {
    "dataset_header": {
        "classification": "string",
        "tags": "string_list",
    },
    "ai_understanding": {
        "summary": "string",
    },
    "business_description": {
        "business_area": "string",
        "domain": "string",
        "data_type": "string",
        "typical_usage": "string_list",
    },
    "terms": "string_list",
}


def normalize_patch(patch: Any) -> tuple[dict[str, Any] | None, list[str]]:
    if not isinstance(patch, dict):
        return None, ["patch"]
    normalized, invalid = _normalize_object(patch, _ALLOWLIST, "")
    return normalized, invalid


def merge_semantic(base: dict[str, Any] | None, patch: dict[str, Any]) -> dict[str, Any]:
    current = dict(base or {})
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(current.get(key), dict):
            current[key] = merge_semantic(current[key], value)
        else:
            current[key] = value
    return current


def _normalize_object(value: dict[str, Any], schema: dict[str, Any], prefix: str) -> tuple[dict[str, Any], list[str]]:
    normalized: dict[str, Any] = {}
    invalid: list[str] = []

    for key, raw_value in value.items():
        path = f"{prefix}.{key}" if prefix else key
        allowed = schema.get(key)
        if allowed is None:
            invalid.append(path)
            continue

        if isinstance(allowed, dict):
            if not isinstance(raw_value, dict):
                invalid.append(path)
                continue
            child, child_invalid = _normalize_object(raw_value, allowed, path)
            if child:
                normalized[key] = child
            invalid.extend(child_invalid)
            continue

        normalized_value = _normalize_leaf(raw_value, allowed)
        if normalized_value is _INVALID:
            invalid.append(path)
            continue
        normalized[key] = normalized_value

    return normalized, invalid


def _normalize_leaf(value: Any, kind: str) -> Any:
    if kind == "string":
        if not isinstance(value, str):
            return _INVALID
        clean = value.strip()
        return clean if clean else _INVALID

    if kind == "string_list":
        if not isinstance(value, list):
            return _INVALID
        items: list[str] = []
        seen: set[str] = set()
        for item in value:
            if not isinstance(item, str):
                return _INVALID
            clean = item.strip()
            if not clean:
                continue
            dedupe_key = clean.casefold()
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            items.append(clean)
        return items

    return _INVALID


_INVALID = object()
