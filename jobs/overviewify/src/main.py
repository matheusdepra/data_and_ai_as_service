from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
import json
from typing import Any

from google.cloud import bigquery
from google.cloud import firestore

from .env import load_env
from .heuristics import detect_language, humanize_name, infer_business_context, infer_relationships, infer_terms
from .read_model import FirestoreReadModel


def main() -> int:
    env = load_env()
    bq = bigquery.Client()
    read_model = FirestoreReadModel(client=firestore.Client())

    read_model.update_overview_status(
        tenant_id=env.tenant_id,
        ingestion_id=env.ingestion_id,
        status="running",
        message="Análise do overview em execução.",
        started=True,
    )

    try:
        ingestion = read_model.get_ingestion(tenant_id=env.tenant_id, ingestion_id=env.ingestion_id)
        if ingestion is None:
            raise RuntimeError("ingestion not found in read model")

        technical_summary = ingestion.get("technical_summary") or {}
        table = bq.get_table(env.bq_table)
        visible_schema = [field for field in table.schema if not field.name.startswith("_dv_")]
        columns = [field.name for field in visible_schema]
        preview_select = ", ".join(f"`{field.name}`" for field in visible_schema) or "*"
        preview_rows = [
            _serialize_row(dict(row.items()))
            for row in bq.query(f"SELECT {preview_select} FROM `{env.bq_table}` LIMIT 10").result()
        ]
        row_count = int(table.num_rows or technical_summary.get("row_count") or 0)
        quality = _quality_payload(row_count=row_count, technical_summary=technical_summary)
        context = infer_business_context(dataset=env.dataset, file_name=env.file_name, columns=columns)
        related = read_model.list_related_ingestions(tenant_id=env.tenant_id)
        relationships = infer_relationships(
            current_columns=columns,
            current_ingestion_id=env.ingestion_id,
            candidates=[candidate for candidate in related if candidate.get("status") == "silver_ready"],
        )

        payload = {
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "dataset_header": {
                "name": humanize_name(env.dataset),
                "status": "Ready" if quality["overall_score"] >= 0.85 else "Ready With Warnings",
                "classification": context["classification"],
                "tags": context["tags"],
                "updated_at": ingestion.get("updated_at"),
            },
            "ai_understanding": {
                "summary": context["understanding"],
                "confidence": context["confidence"],
            },
            "summary": {
                "rows": row_count,
                "columns": len(columns),
                "size_bytes": ingestion.get("file", {}).get("size_bytes"),
                "language": detect_language(dataset=env.dataset, file_name=env.file_name, columns=columns),
                "created_date": ingestion.get("received_at"),
            },
            "schema": {
                "columns": technical_summary.get("schema_normalized")
                or [
                    {
                        "original_name": field.name,
                        "normalized_name": field.name,
                        "source_type": field.field_type.upper(),
                        "inferred_type": field.field_type.upper(),
                        "warnings": [],
                    }
                    for field in visible_schema
                ],
                "mappings": technical_summary.get("column_mappings") or [],
                "warnings": technical_summary.get("normalization_warnings") or [],
            },
            "preview_rows": preview_rows,
            "quality": quality,
            "business_description": {
                "business_area": context["business_area"],
                "domain": context["domain"],
                "data_type": context["data_type"],
                "typical_usage": context["typical_usage"],
            },
            "terms": infer_terms(columns),
            "relationships": relationships,
        }

        read_model.store_overview_payload(
            tenant_id=env.tenant_id,
            ingestion_id=env.ingestion_id,
            payload=payload,
        )
        read_model.update_overview_status(
            tenant_id=env.tenant_id,
            ingestion_id=env.ingestion_id,
            status="ready",
            message="Overview pronto para consulta.",
            finished=True,
        )
        print(
            json.dumps(
                {
                    "tenant_id": env.tenant_id,
                    "ingestion_id": env.ingestion_id,
                    "stage": "overview",
                    "status": "ready",
                    "bq_table": env.bq_table,
                }
            )
        )
        return 0
    except Exception as exc:
        read_model.update_overview_status(
            tenant_id=env.tenant_id,
            ingestion_id=env.ingestion_id,
            status="failed",
            message="Falha ao gerar o overview.",
            error={"reason_code": "overview_generation_failed", "message": str(exc)},
        )
        print(
            json.dumps(
                {
                    "tenant_id": env.tenant_id,
                    "ingestion_id": env.ingestion_id,
                    "stage": "overview",
                    "status": "failed",
                    "error_code": "overview_generation_failed",
                    "error": str(exc),
                }
            )
        )
        raise


def _quality_payload(*, row_count: int, technical_summary: dict[str, Any]) -> dict[str, Any]:
    columns = [
        column
        for column in technical_summary.get("schema_normalized", [])
        if not str(column.get("normalized_name") or "").startswith("_dv_")
    ]
    if not columns or row_count <= 0:
        return {
            "overall_score": 0.8,
            "completeness": 0.8,
            "uniqueness": 0.8,
            "validity": 0.8,
            "consistency": 0.8,
            "timeliness": 0.8,
        }

    completeness = _avg(
        (float(column.get("non_null_count") or 0) / row_count) if row_count else 0.0
        for column in columns
    )
    uniqueness = _avg(
        min(1.0, float(column.get("distinct_count") or 0) / max(float(column.get("non_null_count") or 1), 1.0))
        for column in columns
    )
    validity = _avg(float(column.get("cast_success_rate") or 1.0) for column in columns)
    consistency = _avg(
        1.0
        - (
            float(column.get("blank_count") or 0)
            / max(float(column.get("non_null_count") or 0) + float(column.get("blank_count") or 0), 1.0)
        )
        for column in columns
    )
    timeliness = 1.0 if any(column.get("inferred_type") in {"DATE", "TIMESTAMP"} for column in columns) else 0.78
    overall = _avg([completeness, uniqueness, validity, consistency, timeliness])
    return {
        "overall_score": round(overall, 2),
        "completeness": round(completeness, 2),
        "uniqueness": round(uniqueness, 2),
        "validity": round(validity, 2),
        "consistency": round(consistency, 2),
        "timeliness": round(timeliness, 2),
    }


def _avg(values: Any) -> float:
    items = list(values)
    if not items:
        return 0.0
    return sum(items) / len(items)


def _serialize_row(row: dict[str, Any]) -> dict[str, Any]:
    return {key: _serialize_value(value) for key, value in row.items()}


def _serialize_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, list):
        return [_serialize_value(item) for item in value]
    if isinstance(value, dict):
        return {key: _serialize_value(item) for key, item in value.items()}
    return value


if __name__ == "__main__":
    raise SystemExit(main())
