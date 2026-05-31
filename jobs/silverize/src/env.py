from __future__ import annotations

from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Env:
    dv_env: str
    bq_meta_dataset: str
    bq_location: str
    gcs_bronze_bucket: str
    tenant_id: str
    ingestion_id: str
    gcs_uri: str
    source: str
    dataset: str
    overviewify_job_name: str | None


def _req(name: str) -> str:
    v = os.getenv(name, "").strip()
    if not v:
        raise RuntimeError(f"missing env var: {name}")
    return v


def load_env() -> Env:
    dv_env = os.getenv("DV_ENV", "dev")
    bq_meta_dataset = os.getenv("BQ_META_DATASET") or f"dv_{dv_env}_meta"
    bq_location = os.getenv("BQ_LOCATION", "US")

    return Env(
        dv_env=dv_env,
        bq_meta_dataset=bq_meta_dataset,
        bq_location=bq_location,
        gcs_bronze_bucket=_req("GCS_BRONZE_BUCKET"),
        tenant_id=_req("DV_TENANT_ID"),
        ingestion_id=_req("DV_INGESTION_ID"),
        gcs_uri=_req("DV_GCS_URI"),
        source=os.getenv("DV_SOURCE", "upload"),
        dataset=os.getenv("DV_DATASET", "default"),
        overviewify_job_name=(os.getenv("OVERVIEWIFY_JOB_NAME") or None),
    )
