from __future__ import annotations

from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Env:
    dv_env: str
    bq_meta_dataset: str
    gcs_landing_bucket: str
    gcs_bronze_bucket: str
    gcs_quarantine_bucket: str
    tenant_id: str
    ingestion_id: str
    event_bucket: str
    event_object: str
    event_generation: str | None
    silverize_job_name: str | None


def _req(name: str) -> str:
    v = os.getenv(name, "").strip()
    if not v:
        raise RuntimeError(f"missing env var: {name}")
    return v


def load_env() -> Env:
    dv_env = os.getenv("DV_ENV", "dev")
    bq_meta_dataset = os.getenv("BQ_META_DATASET") or f"dv_{dv_env}_meta"

    return Env(
        dv_env=dv_env,
        bq_meta_dataset=bq_meta_dataset,
        gcs_landing_bucket=_req("GCS_LANDING_BUCKET"),
        gcs_bronze_bucket=_req("GCS_BRONZE_BUCKET"),
        gcs_quarantine_bucket=_req("GCS_QUARANTINE_BUCKET"),
        tenant_id=_req("DV_TENANT_ID"),
        ingestion_id=_req("DV_INGESTION_ID"),
        event_bucket=_req("DV_GCS_BUCKET"),
        event_object=_req("DV_GCS_OBJECT"),
        event_generation=(os.getenv("DV_GCS_GENERATION") or None),
        silverize_job_name=(os.getenv("SILVERIZE_JOB_NAME") or None),
    )
