from __future__ import annotations

from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    dv_env: str
    bq_meta_dataset: str
    bronzeify_job_name: str
    silverize_job_name: str | None


def load_settings() -> Settings:
    dv_env = os.getenv("DV_ENV", "dev")
    bq_meta_dataset = os.getenv("BQ_META_DATASET") or f"dv_{dv_env}_meta"
    bronzeify_job_name = os.getenv("BRONZEIFY_JOB_NAME", "")
    silverize_job_name = os.getenv("SILVERIZE_JOB_NAME") or None

    return Settings(
        dv_env=dv_env,
        bq_meta_dataset=bq_meta_dataset,
        bronzeify_job_name=bronzeify_job_name,
        silverize_job_name=silverize_job_name,
    )

