from __future__ import annotations

import json
import os
from datetime import datetime, timezone

from google.cloud import bigquery
from google.cloud import storage
from google.cloud import run_v2

from .env import load_env
from .metadata import MetadataStore


SUPPORTED_EXTENSIONS = {".csv", ".json", ".parquet"}


def _ext(name: str) -> str:
    _, dot, suffix = name.lower().rpartition(".")
    return f".{suffix}" if dot else ""


def _replace_prefix(object_name: str, from_prefix: str, to_prefix: str) -> str:
    if object_name.startswith(from_prefix):
        return to_prefix + object_name[len(from_prefix) :]
    return to_prefix + object_name


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


def _validate_event_scope(env, meta: MetadataStore) -> bool:
    if env.event_bucket != env.gcs_landing_bucket:
        meta.insert_error(
            tenant_id=env.tenant_id,
            ingestion_id=env.ingestion_id,
            stage="bronze",
            reason_code="unexpected_bucket",
            message=f"event bucket {env.event_bucket} != landing bucket {env.gcs_landing_bucket}",
        )
        return False

    if not env.event_object.startswith("landing/"):
        meta.insert_error(
            tenant_id=env.tenant_id,
            ingestion_id=env.ingestion_id,
            stage="bronze",
            reason_code="unexpected_object_prefix",
            message=f"event object is outside landing prefix: {env.event_object}",
        )
        return False

    path_tenant_id = _extract_kv(env.event_object, "tenant_id")
    if path_tenant_id != env.tenant_id:
        meta.insert_error(
            tenant_id=env.tenant_id,
            ingestion_id=env.ingestion_id,
            stage="bronze",
            reason_code="tenant_mismatch",
            message=f"event tenant_id {path_tenant_id or '-'} != job tenant_id {env.tenant_id}",
        )
        return False

    path_ingestion_id = _extract_ingestion_id(env.event_object)
    if path_ingestion_id != env.ingestion_id:
        meta.insert_error(
            tenant_id=env.tenant_id,
            ingestion_id=env.ingestion_id,
            stage="bronze",
            reason_code="ingestion_mismatch",
            message=f"event ingestion_id {path_ingestion_id or '-'} != job ingestion_id {env.ingestion_id}",
        )
        return False

    return True


def main() -> int:
    env = load_env()

    gcs = storage.Client()
    bq = bigquery.Client()
    run_jobs = run_v2.JobsClient()
    meta = MetadataStore(bq_client=bq, dataset_id=env.bq_meta_dataset)

    if not _validate_event_scope(env, meta):
        return 1

    src_bucket = gcs.bucket(env.event_bucket)
    src_blob = src_bucket.blob(env.event_object, generation=env.event_generation)

    ext = _ext(env.event_object)
    if ext not in SUPPORTED_EXTENSIONS:
        # Quarantine: copy original + write error.json
        q_bucket = gcs.bucket(env.gcs_quarantine_bucket)
        q_object = _replace_prefix(env.event_object, "landing/", "quarantine/")
        q_blob = q_bucket.blob(q_object)
        q_blob.rewrite(src_blob)

        err_obj = q_object.rsplit("/", 1)[0] + "/error.json"
        err_blob = q_bucket.blob(err_obj)
        err_blob.upload_from_string(
            json.dumps(
                {
                    "tenant_id": env.tenant_id,
                    "ingestion_id": env.ingestion_id,
                    "reason_code": "unsupported_format",
                    "message": f"unsupported extension: {ext}",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            ),
            content_type="application/json",
        )

        meta.update_status(tenant_id=env.tenant_id, ingestion_id=env.ingestion_id, status="quarantined")
        meta.insert_artifact(
            tenant_id=env.tenant_id,
            ingestion_id=env.ingestion_id,
            layer="quarantine",
            artifact_id=str(q_blob.generation or ""),
            gcs_uri=f"gs://{env.gcs_quarantine_bucket}/{q_object}",
        )
        meta.insert_artifact(
            tenant_id=env.tenant_id,
            ingestion_id=env.ingestion_id,
            layer="quarantine",
            artifact_id="error.json",
            gcs_uri=f"gs://{env.gcs_quarantine_bucket}/{err_obj}",
        )
        return 0

    # Bronze: idempotency check. If manifest already exists, consider the ingestion processed.
    bronze_bucket = gcs.bucket(env.gcs_bronze_bucket)
    bronze_object = _replace_prefix(env.event_object, "landing/", "bronze/")
    manifest_object = bronze_object.rsplit("/", 1)[0] + "/manifest.json"
    if bronze_bucket.blob(manifest_object).exists():
        meta.update_status(
            tenant_id=env.tenant_id,
            ingestion_id=env.ingestion_id,
            status="bronze_ready",
            timestamp_field="bronze_ready_at",
        )
        if env.silverize_job_name:
            bronze_uri = f"gs://{env.gcs_bronze_bucket}/{bronze_object}"
            override = run_v2.RunJobRequest.Overrides(
                container_overrides=[
                    run_v2.RunJobRequest.Overrides.ContainerOverride(
                        env=[
                            run_v2.EnvVar(name="DV_TENANT_ID", value=env.tenant_id),
                            run_v2.EnvVar(name="DV_INGESTION_ID", value=env.ingestion_id),
                            run_v2.EnvVar(name="DV_GCS_URI", value=bronze_uri),
                            run_v2.EnvVar(name="DV_SOURCE", value=(_extract_kv(env.event_object, "source") or "upload")),
                            run_v2.EnvVar(name="DV_DATASET", value=(_extract_kv(env.event_object, "dataset") or "default")),
                        ]
                    )
                ]
            )
            run_jobs.run_job(request=run_v2.RunJobRequest(name=env.silverize_job_name, overrides=override))
        return 0

    # Bronze: MVP copies the original object and writes a manifest.
    # TODO: Convert CSV/JSON to Parquet as part of the "normalizacao tecnica".
    bronze_blob = bronze_bucket.blob(bronze_object)
    bronze_blob.rewrite(src_blob)

    manifest_blob = bronze_bucket.blob(manifest_object)
    manifest = {
        "tenant_id": env.tenant_id,
        "source": _extract_kv(env.event_object, "source"),
        "dataset": _extract_kv(env.event_object, "dataset"),
        "ingestion_id": env.ingestion_id,
        "original": {
            "filename": os.path.basename(env.event_object),
            "content_type": src_blob.content_type,
            "size_bytes": src_blob.size,
            "checksum_sha256": None,
        },
        "detected_format": ext.lstrip("."),
        "schema_inferred": None,
        "row_count": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    manifest_blob.upload_from_string(json.dumps(manifest), content_type="application/json")

    meta.update_status(tenant_id=env.tenant_id, ingestion_id=env.ingestion_id, status="bronze_ready", timestamp_field="bronze_ready_at")
    meta.insert_artifact(
        tenant_id=env.tenant_id,
        ingestion_id=env.ingestion_id,
        layer="bronze",
        artifact_id=str(bronze_blob.generation or ""),
        gcs_uri=f"gs://{env.gcs_bronze_bucket}/{bronze_object}",
    )
    meta.insert_artifact(
        tenant_id=env.tenant_id,
        ingestion_id=env.ingestion_id,
        layer="bronze",
        artifact_id="manifest.json",
        gcs_uri=f"gs://{env.gcs_bronze_bucket}/{manifest_object}",
    )

    # Optional chaining: kick off silverize using the bronze artifact.
    if env.silverize_job_name:
        bronze_uri = f"gs://{env.gcs_bronze_bucket}/{bronze_object}"
        override = run_v2.RunJobRequest.Overrides(
            container_overrides=[
                run_v2.RunJobRequest.Overrides.ContainerOverride(
                    env=[
                        run_v2.EnvVar(name="DV_TENANT_ID", value=env.tenant_id),
                        run_v2.EnvVar(name="DV_INGESTION_ID", value=env.ingestion_id),
                        run_v2.EnvVar(name="DV_GCS_URI", value=bronze_uri),
                        run_v2.EnvVar(name="DV_SOURCE", value=(manifest.get("source") or "upload")),
                        run_v2.EnvVar(name="DV_DATASET", value=(manifest.get("dataset") or "default")),
                    ]
                )
            ]
        )
        run_jobs.run_job(request=run_v2.RunJobRequest(name=env.silverize_job_name, overrides=override))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
