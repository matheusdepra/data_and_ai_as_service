from __future__ import annotations

import json
import re
from datetime import datetime, timezone

from google.cloud import bigquery
from google.cloud import firestore
from google.cloud import run_v2
from google.cloud import storage

from .env import load_env
from .metadata import MetadataStore
from .read_model import FirestoreReadModel
from .schema_tools import build_profiles, build_projection_sql, profile_to_dict


_SAFE_TABLE_RE = re.compile(r"^[a-zA-Z0-9_]{1,1024}$")


def _parse_gcs_uri(uri: str) -> tuple[str, str]:
    if not uri.startswith("gs://"):
        raise ValueError("DV_GCS_URI must start with gs://")
    rest = uri[len("gs://") :]
    bucket, _, name = rest.partition("/")
    if not bucket or not name:
        raise ValueError("invalid gs:// uri")
    return bucket, name


def _ext(name: str) -> str:
    _, dot, suffix = name.lower().rpartition(".")
    return f".{suffix}" if dot else ""


def _dataset_id(env: str, tenant_id: str) -> str:
    return f"{env}_silver_{tenant_id}"


def _table_id(dataset: str) -> str:
    # MVP: one table per user-provided dataset bucket.
    t = f"uploaded__{dataset}".replace("-", "_")
    if not _SAFE_TABLE_RE.match(t):
        return "uploaded__default"
    return t


def _staging_table_id(ingestion_id: str) -> str:
    t = "stg__" + ingestion_id.replace("-", "_")
    if not _SAFE_TABLE_RE.match(t):
        return "stg__ingestion"
    return t


def _manifest_object_name(object_name: str) -> str:
    return object_name.rsplit("/", 1)[0] + "/manifest.json"


def _extract_kv(object_name: str, key: str) -> str | None:
    for part in object_name.split("/"):
        if part.startswith(f"{key}="):
            v = part.split("=", 1)[1].strip()
            return v or None
    return None


def _extract_ingestion_id(object_name: str) -> str | None:
    parts = object_name.split("/")
    for i, part in enumerate(parts):
        if part.startswith("ingestion_date=") and i + 1 < len(parts):
            ingestion_id = parts[i + 1].strip()
            return ingestion_id or None
    return None


def _validate_bronze_scope(env, bucket_name: str, object_name: str) -> None:
    if bucket_name != env.gcs_bronze_bucket:
        raise RuntimeError(f"GCS bucket {bucket_name} != bronze bucket {env.gcs_bronze_bucket}")

    if not object_name.startswith("bronze/"):
        raise RuntimeError(f"GCS object is outside bronze prefix: {object_name}")

    path_tenant_id = _extract_kv(object_name, "tenant_id")
    if path_tenant_id != env.tenant_id:
        raise RuntimeError(f"GCS tenant_id {path_tenant_id or '-'} != job tenant_id {env.tenant_id}")

    path_ingestion_id = _extract_ingestion_id(object_name)
    if path_ingestion_id != env.ingestion_id:
        raise RuntimeError(f"GCS ingestion_id {path_ingestion_id or '-'} != job ingestion_id {env.ingestion_id}")


def _write_manifest(*, gcs: storage.Client, bucket_name: str, object_name: str, extra: dict[str, object]) -> None:
    manifest_object = _manifest_object_name(object_name)
    blob = gcs.bucket(bucket_name).blob(manifest_object)
    payload: dict[str, object] = {}
    if blob.exists():
        try:
            payload = json.loads(blob.download_as_text() or "{}")
        except Exception:
            payload = {}
    payload.update(extra)
    blob.upload_from_string(json.dumps(payload), content_type="application/json")


def main() -> int:
    env = load_env()

    bq = bigquery.Client()
    gcs = storage.Client()
    jobs = run_v2.JobsClient()
    meta = MetadataStore(bq_client=bq, dataset_id=env.bq_meta_dataset)
    read_model = FirestoreReadModel(client=firestore.Client())

    bucket_name, object_name = _parse_gcs_uri(env.gcs_uri)
    _validate_bronze_scope(env, bucket_name, object_name)
    ext = _ext(object_name)

    meta.update_status(tenant_id=env.tenant_id, ingestion_id=env.ingestion_id, status="silver_running", timestamp_field="silver_started_at")
    read_model.update_status(
        tenant_id=env.tenant_id,
        ingestion_id=env.ingestion_id,
        status="silver_running",
        stage="silver",
        message="Materialização silver iniciada.",
        collection_slug=env.dataset,
        timestamp_field="silver_started_at",
    )
    print(json.dumps({"tenant_id": env.tenant_id, "ingestion_id": env.ingestion_id, "collection_slug": env.dataset, "stage": "silver", "status": "silver_running", "gcs_uri": env.gcs_uri}))

    silver_dataset = _dataset_id(env.dv_env, env.tenant_id)
    dataset_ref = bigquery.Dataset(f"{bq.project}.{silver_dataset}")
    dataset_ref.location = env.bq_location
    bq.create_dataset(dataset_ref, exists_ok=True)

    table_id = _table_id(env.dataset)
    full_table = f"{bq.project}.{silver_dataset}.{table_id}"
    staging_table_id = _staging_table_id(env.ingestion_id)
    staging_table = f"{bq.project}.{silver_dataset}.{staging_table_id}"
    technical_summary: dict[str, object]

    if ext in {".csv", ".parquet"}:
        # Load into staging, then query-append into final table with lineage columns.
        job_config = bigquery.LoadJobConfig(write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE)
        if ext == ".csv":
            job_config.source_format = bigquery.SourceFormat.CSV
            job_config.autodetect = True
            job_config.skip_leading_rows = 1
        else:
            job_config.source_format = bigquery.SourceFormat.PARQUET
        load_job = bq.load_table_from_uri(env.gcs_uri, staging_table, job_config=job_config)
        load_job.result()
    elif ext == ".json":
        # Try NDJSON first (BigQuery requires newline-delimited JSON for batch load).
        job_config = bigquery.LoadJobConfig(write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE)
        job_config.autodetect = True
        job_config.source_format = bigquery.SourceFormat.NEWLINE_DELIMITED_JSON
        try:
            load_job = bq.load_table_from_uri(env.gcs_uri, staging_table, job_config=job_config)
            load_job.result()
        except Exception:
            # Fallback for arbitrary JSON: store raw payload as a single row.
            payload_table = f"{bq.project}.{silver_dataset}.uploaded__json_payload"
            schema = [
                bigquery.SchemaField("_dv_ingestion_id", "STRING"),
                bigquery.SchemaField("_dv_ingested_at", "TIMESTAMP"),
                bigquery.SchemaField("_dv_source", "STRING"),
                bigquery.SchemaField("_dv_original_filename", "STRING"),
                bigquery.SchemaField("payload", "STRING"),
            ]
            bq.create_table(bigquery.Table(payload_table, schema=schema), exists_ok=True)

            b = gcs.bucket(bucket_name).blob(object_name)
            raw = b.download_as_bytes()  # MVP: ok for small payloads; set size limits in ingestion-api.

            # Idempotency: remove any prior row for this ingestion.
            bq.query(
                f"DELETE FROM `{payload_table}` WHERE _dv_ingestion_id = @ingestion_id",
                job_config=bigquery.QueryJobConfig(
                    query_parameters=[bigquery.ScalarQueryParameter("ingestion_id", "STRING", env.ingestion_id)]
                ),
            ).result()

            rows = [
                {
                    "_dv_ingestion_id": env.ingestion_id,
                    "_dv_ingested_at": datetime.now(timezone.utc).isoformat(),
                    "_dv_source": env.source,
                    "_dv_original_filename": object_name.rsplit("/", 1)[-1],
                    "payload": raw.decode("utf-8", errors="replace"),
                }
            ]
            errors = bq.insert_rows_json(payload_table, rows)
            if errors:
                raise RuntimeError(f"insert_rows_json errors: {errors}")

            full_table = payload_table
            technical_summary = {
                "row_count": 1,
                "bq_table": full_table,
                "schema_original": [{"name": "payload", "type": "STRING"}],
                "schema_normalized": [
                    {
                        "original_name": "payload",
                        "normalized_name": "payload",
                        "source_type": "STRING",
                        "inferred_type": "STRING",
                        "total_rows": 1,
                        "non_null_count": 1,
                        "blank_count": 0,
                        "distinct_count": 1,
                        "cast_success_count": 1,
                        "cast_success_rate": 1.0,
                        "warnings": ["arbitrary JSON preserved as payload"],
                    }
                ],
                "column_mappings": [{"original_name": "payload", "normalized_name": "payload"}],
                "cast_report": [
                    {
                        "normalized_name": "payload",
                        "inferred_type": "STRING",
                        "cast_success_rate": 1.0,
                        "warnings": ["arbitrary JSON preserved as payload"],
                    }
                ],
                "normalization_warnings": ["arbitrary JSON preserved as payload"],
            }
            _write_manifest(
                gcs=gcs,
                bucket_name=bucket_name,
                object_name=object_name,
                extra={
                    "schema_original": technical_summary["schema_original"],
                    "schema_normalized": technical_summary["schema_normalized"],
                    "column_mappings": technical_summary["column_mappings"],
                    "cast_report": technical_summary["cast_report"],
                    "row_count": technical_summary["row_count"],
                    "normalization_warnings": technical_summary["normalization_warnings"],
                },
            )
    else:
        raise RuntimeError(f"unsupported extension: {ext}")

    # If we used a staging table, merge it into the final table with lineage columns and dedupe by ingestion_id.
    if full_table != f"{bq.project}.{silver_dataset}.uploaded__json_payload":
        staging_obj = bq.get_table(staging_table)
        row_count = int(staging_obj.num_rows or 0)
        profiles = build_profiles(bq=bq, staging_table=staging_table, schema=list(staging_obj.schema), row_count=row_count)
        projection_sql = build_projection_sql(profiles=profiles)
        schema_original = [{"name": field.name, "type": field.field_type.upper()} for field in staging_obj.schema]
        schema_normalized = [profile_to_dict(profile) for profile in profiles]
        column_mappings = [
            {"original_name": profile.original_name, "normalized_name": profile.normalized_name}
            for profile in profiles
        ]
        cast_report = [
            {
                "normalized_name": profile.normalized_name,
                "inferred_type": profile.inferred_type,
                "cast_success_rate": round(profile.cast_success_rate, 4),
                "cast_success_count": profile.cast_success_count,
                "non_null_count": profile.non_null_count,
                "warnings": profile.warnings,
            }
            for profile in profiles
        ]
        normalization_warnings = [warning for profile in profiles for warning in profile.warnings]
        original_filename = object_name.rsplit("/", 1)[-1]

        # Idempotency: delete previously ingested rows if the lineage column exists.
        try:
            bq.query(
                f"DELETE FROM `{full_table}` WHERE _dv_ingestion_id = @ingestion_id",
                job_config=bigquery.QueryJobConfig(
                    query_parameters=[bigquery.ScalarQueryParameter("ingestion_id", "STRING", env.ingestion_id)]
                ),
            ).result()
        except Exception:
            # Table might not exist yet or might not have lineage column; ignore and let create_disposition handle it.
            pass

        job_config = bigquery.QueryJobConfig(
            destination=full_table,
            create_disposition=bigquery.CreateDisposition.CREATE_IF_NEEDED,
            write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
            schema_update_options=[bigquery.SchemaUpdateOption.ALLOW_FIELD_ADDITION],
            query_parameters=[
                bigquery.ScalarQueryParameter("ingestion_id", "STRING", env.ingestion_id),
                bigquery.ScalarQueryParameter("source", "STRING", env.source),
                bigquery.ScalarQueryParameter("original_filename", "STRING", original_filename),
            ],
        )
        query = f"""
SELECT
  {projection_sql},
  @ingestion_id AS _dv_ingestion_id,
  CURRENT_TIMESTAMP() AS _dv_ingested_at,
  @source AS _dv_source,
  @original_filename AS _dv_original_filename
FROM `{staging_table}`
"""
        bq.query(query, job_config=job_config).result()
        technical_summary = {
            "row_count": row_count,
            "bq_table": full_table,
            "schema_original": schema_original,
            "schema_normalized": schema_normalized,
            "column_mappings": column_mappings,
            "cast_report": cast_report,
            "normalization_warnings": normalization_warnings,
        }
        _write_manifest(
            gcs=gcs,
            bucket_name=bucket_name,
            object_name=object_name,
            extra={
                "schema_original": schema_original,
                "schema_normalized": schema_normalized,
                "column_mappings": column_mappings,
                "cast_report": cast_report,
                "row_count": row_count,
                "normalization_warnings": normalization_warnings,
            },
        )

    meta.update_status(tenant_id=env.tenant_id, ingestion_id=env.ingestion_id, status="silver_ready", timestamp_field="silver_ready_at")
    read_model.update_status(
        tenant_id=env.tenant_id,
        ingestion_id=env.ingestion_id,
        status="silver_ready",
        stage="silver",
        message="Tabela silver pronta para consulta.",
        collection_slug=env.dataset,
        artifact={"layer": "silver", "bq_table": full_table},
        timestamp_field="silver_ready_at",
    )
    read_model.update_technical_summary(
        tenant_id=env.tenant_id,
        ingestion_id=env.ingestion_id,
        technical_summary=technical_summary,
    )
    print(json.dumps({"tenant_id": env.tenant_id, "ingestion_id": env.ingestion_id, "collection_slug": env.dataset, "stage": "silver", "status": "silver_ready", "bq_table": full_table}))
    meta.insert_artifact_bq(
        tenant_id=env.tenant_id,
        ingestion_id=env.ingestion_id,
        layer="silver",
        artifact_id=table_id,
        bq_table=full_table,
    )

    if env.overviewify_job_name:
        try:
            read_model.update_overview_status(
                tenant_id=env.tenant_id,
                ingestion_id=env.ingestion_id,
                status="pending",
                message="Análise do overview enfileirada.",
            )
            override = run_v2.RunJobRequest.Overrides(
                container_overrides=[
                    run_v2.RunJobRequest.Overrides.ContainerOverride(
                        env=[
                            run_v2.EnvVar(name="DV_TENANT_ID", value=env.tenant_id),
                            run_v2.EnvVar(name="DV_INGESTION_ID", value=env.ingestion_id),
                            run_v2.EnvVar(name="DV_BQ_TABLE", value=full_table),
                            run_v2.EnvVar(name="DV_DATASET", value=env.dataset),
                            run_v2.EnvVar(name="DV_SOURCE", value=env.source),
                            run_v2.EnvVar(name="DV_FILE_NAME", value=object_name.rsplit("/", 1)[-1]),
                        ]
                    )
                ]
            )
            jobs.run_job(request=run_v2.RunJobRequest(name=env.overviewify_job_name, overrides=override))
            print(
                json.dumps(
                    {
                        "tenant_id": env.tenant_id,
                        "ingestion_id": env.ingestion_id,
                        "collection_slug": env.dataset,
                        "stage": "overview",
                        "status": "pending",
                        "bq_table": full_table,
                    }
                )
            )
        except Exception as exc:
            read_model.update_overview_status(
                tenant_id=env.tenant_id,
                ingestion_id=env.ingestion_id,
                status="failed",
                message="Falha ao disparar análise do overview.",
                error={"reason_code": "overview_dispatch_failed", "message": str(exc)},
            )
            print(
                json.dumps(
                    {
                        "tenant_id": env.tenant_id,
                        "ingestion_id": env.ingestion_id,
                        "collection_slug": env.dataset,
                        "stage": "overview",
                        "status": "failed",
                        "error_code": "overview_dispatch_failed",
                        "error": str(exc),
                    }
                )
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
