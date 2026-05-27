from __future__ import annotations

import re
from datetime import datetime, timezone

from google.cloud import bigquery
from google.cloud import storage

from .env import load_env
from .metadata import MetadataStore


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


def main() -> int:
    env = load_env()

    bq = bigquery.Client()
    gcs = storage.Client()
    meta = MetadataStore(bq_client=bq, dataset_id=env.bq_meta_dataset)

    meta.update_status(tenant_id=env.tenant_id, ingestion_id=env.ingestion_id, status="silver_running", timestamp_field="silver_started_at")

    silver_dataset = _dataset_id(env.dv_env, env.tenant_id)
    dataset_ref = bigquery.Dataset(f"{bq.project}.{silver_dataset}")
    dataset_ref.location = env.bq_location
    bq.create_dataset(dataset_ref, exists_ok=True)

    bucket_name, object_name = _parse_gcs_uri(env.gcs_uri)
    ext = _ext(object_name)

    table_id = _table_id(env.dataset)
    full_table = f"{bq.project}.{silver_dataset}.{table_id}"
    staging_table_id = _staging_table_id(env.ingestion_id)
    staging_table = f"{bq.project}.{silver_dataset}.{staging_table_id}"

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
    else:
        raise RuntimeError(f"unsupported extension: {ext}")

    # If we used a staging table, merge it into the final table with lineage columns and dedupe by ingestion_id.
    if full_table != f"{bq.project}.{silver_dataset}.uploaded__json_payload":
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
  s.*,
  @ingestion_id AS _dv_ingestion_id,
  CURRENT_TIMESTAMP() AS _dv_ingested_at,
  @source AS _dv_source,
  @original_filename AS _dv_original_filename
FROM `{staging_table}` s
"""
        bq.query(query, job_config=job_config).result()

    meta.update_status(tenant_id=env.tenant_id, ingestion_id=env.ingestion_id, status="silver_ready", timestamp_field="silver_ready_at")
    meta.insert_artifact_bq(
        tenant_id=env.tenant_id,
        ingestion_id=env.ingestion_id,
        layer="silver",
        artifact_id=table_id,
        bq_table=full_table,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
