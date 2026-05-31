from __future__ import annotations

import re
from typing import Any


def humanize_name(value: str) -> str:
    return " ".join(part.capitalize() for part in str(value or "").replace("-", "_").split("_") if part)


def infer_business_context(*, dataset: str, file_name: str, columns: list[str]) -> dict[str, Any]:
    haystack = " ".join([dataset, file_name, *columns]).lower()
    area = "Operations"
    domain = "General"
    data_type = "Reference Data"
    typical_usage = ["Reporting", "Analytics"]
    classification = "Operations / General"
    confidence = 0.72

    if any(token in haystack for token in ("customer", "client", "crm", "account")):
        area = "Commercial"
        domain = "Sales"
        data_type = "Master Data"
        typical_usage = ["CRM", "Segmentation", "Customer Analytics"]
        classification = "Commercial / Sales"
        confidence = 0.94
    elif any(token in haystack for token in ("order", "purchase", "invoice", "billing", "payment")):
        area = "Finance"
        domain = "Revenue"
        data_type = "Transactional Data"
        typical_usage = ["Revenue Tracking", "Billing Analysis", "Operations"]
        classification = "Finance / Revenue"
        confidence = 0.89
    elif any(token in haystack for token in ("contract", "agreement", "renewal")):
        area = "Commercial"
        domain = "Contracts"
        data_type = "Operational Data"
        typical_usage = ["Renewal Control", "Commercial Reporting", "Portfolio Tracking"]
        classification = "Commercial / Contracts"
        confidence = 0.86

    tags = _unique_preserving_order(
        [
            humanize_name(dataset),
            area,
            domain,
            *[humanize_name(col) for col in columns[:4]],
        ]
    )
    understanding = (
        f"This dataset represents {humanize_name(dataset) or 'the uploaded dataset'} and appears to support "
        f"{domain.lower()} workflows in the {area.lower()} area. "
        f"It is best suited for {', '.join(typical_usage[:2]).lower()}."
    )

    return {
        "business_area": area,
        "domain": domain,
        "data_type": data_type,
        "typical_usage": typical_usage,
        "classification": classification,
        "confidence": confidence,
        "tags": tags[:6],
        "understanding": understanding,
    }


def infer_terms(columns: list[str]) -> list[str]:
    preferred = [column for column in columns if not column.startswith("_dv_")]
    return [humanize_name(column) for column in preferred[:10]]


def infer_relationships(
    *,
    current_columns: list[str],
    current_ingestion_id: str,
    candidates: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    current = {column for column in current_columns if not column.startswith("_dv_")}
    relationships: list[dict[str, Any]] = []
    for candidate in candidates:
        if candidate.get("ingestion_id") == current_ingestion_id:
            continue
        tech = candidate.get("technical_summary") or {}
        related_columns = {
            str(item.get("normalized_name") or "")
            for item in tech.get("schema_normalized", [])
            if item.get("normalized_name")
        }
        shared = sorted(current & related_columns)
        if len(shared) < 2:
            continue
        confidence = min(0.98, 0.62 + (0.09 * len(shared)))
        relationships.append(
            {
                "ingestion_id": candidate.get("ingestion_id"),
                "collection_slug": candidate.get("collection_slug") or candidate.get("dataset") or "dataset",
                "dataset_name": humanize_name(str(candidate.get("collection_slug") or candidate.get("dataset") or "dataset")),
                "confidence": round(confidence, 2),
                "shared_columns": shared[:6],
            }
        )
    relationships.sort(key=lambda item: item["confidence"], reverse=True)
    return relationships[:5]


def detect_language(*, dataset: str, file_name: str, columns: list[str]) -> str:
    haystack = " ".join([dataset, file_name, *columns]).lower()
    portuguese_hints = ("cliente", "contrato", "fatur", "venda", "pedido", "nome", "cidade")
    if any(token in haystack for token in portuguese_hints):
        return "Portuguese"
    return "English"


def _unique_preserving_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for value in values:
        cleaned = re.sub(r"\s+", " ", str(value or "")).strip()
        if not cleaned:
            continue
        key = cleaned.lower()
        if key in seen:
            continue
        seen.add(key)
        output.append(cleaned)
    return output
