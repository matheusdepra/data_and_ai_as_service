from __future__ import annotations

from dataclasses import dataclass
import re
import unicodedata
from typing import Any

from google.cloud import bigquery


_NON_ALNUM_RE = re.compile(r"[^a-z0-9]+")
_BOOL_TRUE = ("true", "1", "yes", "y", "sim", "s")
_BOOL_FALSE = ("false", "0", "no", "n", "nao", "não")


@dataclass(frozen=True)
class ColumnProfile:
    original_name: str
    normalized_name: str
    source_type: str
    inferred_type: str
    total_rows: int
    non_null_count: int
    blank_count: int
    distinct_count: int
    cast_success_count: int
    cast_success_rate: float
    warnings: list[str]


def normalize_column_name(name: str, *, seen: set[str]) -> tuple[str, list[str]]:
    base = unicodedata.normalize("NFD", str(name or "column"))
    base = "".join(ch for ch in base if unicodedata.category(ch) != "Mn")
    base = _NON_ALNUM_RE.sub("_", base.strip().lower()).strip("_") or "column"
    if base[0].isdigit():
        base = f"col_{base}"

    normalized = base
    index = 2
    warnings: list[str] = []
    while normalized in seen:
        normalized = f"{base}_{index}"
        index += 1
    if normalized != name:
        warnings.append(f"renamed `{name}` -> `{normalized}`")
    seen.add(normalized)
    return normalized, warnings


def build_profiles(
    *,
    bq: bigquery.Client,
    staging_table: str,
    schema: list[bigquery.SchemaField],
    row_count: int,
) -> list[ColumnProfile]:
    seen: set[str] = set()
    profiles: list[ColumnProfile] = []
    for field in schema:
        normalized_name, warnings = normalize_column_name(field.name, seen=seen)
        stats = _profile_column(bq=bq, staging_table=staging_table, field=field)
        inferred_type, cast_success_count, cast_success_rate, infer_warnings = _infer_type(
            field=field,
            stats=stats,
            row_count=row_count,
        )
        profiles.append(
            ColumnProfile(
                original_name=field.name,
                normalized_name=normalized_name,
                source_type=field.field_type.upper(),
                inferred_type=inferred_type,
                total_rows=row_count,
                non_null_count=stats["non_null_count"],
                blank_count=stats["blank_count"],
                distinct_count=stats["distinct_count"],
                cast_success_count=cast_success_count,
                cast_success_rate=cast_success_rate,
                warnings=warnings + infer_warnings,
            )
        )
    return profiles


def build_projection_sql(*, profiles: list[ColumnProfile]) -> str:
    projections = [f"{cast_expression(profile)} AS `{profile.normalized_name}`" for profile in profiles]
    return ",\n  ".join(projections)


def cast_expression(profile: ColumnProfile) -> str:
    raw = _raw_value_expression(profile.original_name, profile.source_type)
    trimmed = _trimmed_string_expression(profile.original_name, profile.source_type)

    if profile.inferred_type == "INT64":
        return f"SAFE_CAST({trimmed} AS INT64)"
    if profile.inferred_type == "FLOAT64":
        return f"SAFE_CAST({trimmed} AS FLOAT64)"
    if profile.inferred_type == "BOOL":
        return (
            f"CASE "
            f"WHEN {trimmed} IS NULL THEN NULL "
            f"WHEN LOWER({trimmed}) IN ({_literal_list(_BOOL_TRUE)}) THEN TRUE "
            f"WHEN LOWER({trimmed}) IN ({_literal_list(_BOOL_FALSE)}) THEN FALSE "
            f"ELSE NULL END"
        )
    if profile.inferred_type == "DATE":
        return f"SAFE_CAST({trimmed} AS DATE)"
    if profile.inferred_type == "TIMESTAMP":
        return f"SAFE_CAST({trimmed} AS TIMESTAMP)"
    return f"NULLIF(TRIM({raw}), '')"


def profile_to_dict(profile: ColumnProfile) -> dict[str, Any]:
    return {
        "original_name": profile.original_name,
        "normalized_name": profile.normalized_name,
        "source_type": profile.source_type,
        "inferred_type": profile.inferred_type,
        "total_rows": profile.total_rows,
        "non_null_count": profile.non_null_count,
        "blank_count": profile.blank_count,
        "distinct_count": profile.distinct_count,
        "cast_success_count": profile.cast_success_count,
        "cast_success_rate": round(profile.cast_success_rate, 4),
        "warnings": profile.warnings,
    }


def _profile_column(*, bq: bigquery.Client, staging_table: str, field: bigquery.SchemaField) -> dict[str, int]:
    raw = _raw_value_expression(field.name, field.field_type.upper())
    trimmed = _trimmed_string_expression(field.name, field.field_type.upper())

    query = f"""
SELECT
  COUNT(1) AS total_rows,
  COUNTIF({raw} IS NOT NULL) AS non_null_count,
  COUNTIF({raw} IS NOT NULL AND TRIM({raw}) = '') AS blank_count,
  APPROX_COUNT_DISTINCT(CAST({raw} AS STRING)) AS distinct_count,
  COUNTIF(SAFE_CAST({trimmed} AS INT64) IS NOT NULL) AS int_success,
  COUNTIF(SAFE_CAST({trimmed} AS FLOAT64) IS NOT NULL) AS float_success,
  COUNTIF({trimmed} IS NOT NULL AND LOWER({trimmed}) IN ({_literal_list(_BOOL_TRUE + _BOOL_FALSE)})) AS bool_success,
  COUNTIF(SAFE_CAST({trimmed} AS DATE) IS NOT NULL) AS date_success,
  COUNTIF(SAFE_CAST({trimmed} AS TIMESTAMP) IS NOT NULL) AS timestamp_success
FROM `{staging_table}`
"""
    row = next(iter(bq.query(query).result()))
    return {
        "total_rows": int(row["total_rows"] or 0),
        "non_null_count": int(row["non_null_count"] or 0),
        "blank_count": int(row["blank_count"] or 0),
        "distinct_count": int(row["distinct_count"] or 0),
        "int_success": int(row["int_success"] or 0),
        "float_success": int(row["float_success"] or 0),
        "bool_success": int(row["bool_success"] or 0),
        "date_success": int(row["date_success"] or 0),
        "timestamp_success": int(row["timestamp_success"] or 0),
    }


def _infer_type(*, field: bigquery.SchemaField, stats: dict[str, int], row_count: int) -> tuple[str, int, float, list[str]]:
    source_type = field.field_type.upper()
    non_null_count = max(stats["non_null_count"] - stats["blank_count"], 0)
    warnings: list[str] = []

    if non_null_count == 0:
        return "STRING", 0, 1.0, warnings + ["column only contains null/blank values"]

    if field.mode == "REPEATED" or source_type == "RECORD":
        return "STRING", non_null_count, 1.0, warnings + ["complex type preserved as stringified JSON"]

    preserved = {
        "INTEGER": "INT64",
        "INT64": "INT64",
        "FLOAT": "FLOAT64",
        "FLOAT64": "FLOAT64",
        "NUMERIC": "FLOAT64",
        "BIGNUMERIC": "FLOAT64",
        "BOOLEAN": "BOOL",
        "BOOL": "BOOL",
        "DATE": "DATE",
        "TIMESTAMP": "TIMESTAMP",
        "DATETIME": "TIMESTAMP",
        "TIME": "STRING",
    }.get(source_type)
    if preserved:
        return preserved, non_null_count, 1.0, warnings

    ratios = {
        "INT64": stats["int_success"] / non_null_count,
        "FLOAT64": stats["float_success"] / non_null_count,
        "BOOL": stats["bool_success"] / non_null_count,
        "DATE": stats["date_success"] / non_null_count,
        "TIMESTAMP": stats["timestamp_success"] / non_null_count,
    }

    chosen = "STRING"
    success_count = non_null_count
    if ratios["BOOL"] >= 0.98:
        chosen = "BOOL"
        success_count = stats["bool_success"]
    elif ratios["INT64"] >= 0.98:
        chosen = "INT64"
        success_count = stats["int_success"]
    elif ratios["FLOAT64"] >= 0.98:
        chosen = "FLOAT64"
        success_count = stats["float_success"]
    elif ratios["DATE"] >= 0.95 and _prefer_date(field.name, ratios):
        chosen = "DATE"
        success_count = stats["date_success"]
    elif ratios["TIMESTAMP"] >= 0.95:
        chosen = "TIMESTAMP"
        success_count = stats["timestamp_success"]

    cast_success_rate = success_count / non_null_count if non_null_count else 1.0
    if chosen != "STRING" and cast_success_rate < 1.0:
        warnings.append(f"{non_null_count - success_count} values could not be cast to {chosen}")
    if chosen == "STRING" and row_count and stats["blank_count"] > 0:
        warnings.append("blank string values preserved as null")
    return chosen, success_count, cast_success_rate, warnings


def _prefer_date(name: str, ratios: dict[str, float]) -> bool:
    lowered = name.lower()
    if "timestamp" in lowered or lowered.endswith("_at") or "time" in lowered:
        return False
    if "date" in lowered:
        return True
    return ratios["DATE"] >= ratios["TIMESTAMP"]


def _raw_value_expression(name: str, source_type: str) -> str:
    identifier = f"`{name}`"
    if source_type == "RECORD":
        return f"TO_JSON_STRING({identifier})"
    return f"CAST({identifier} AS STRING)"


def _trimmed_string_expression(name: str, source_type: str) -> str:
    return f"NULLIF(TRIM({_raw_value_expression(name, source_type)}), '')"


def _literal_list(values: tuple[str, ...]) -> str:
    return ", ".join(f"'{value}'" for value in values)
