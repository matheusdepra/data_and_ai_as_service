from __future__ import annotations

from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Env:
    dv_env: str
    tenant_id: str
    ingestion_id: str
    bq_table: str
    dataset: str
    source: str
    file_name: str


def _req(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"missing env var: {name}")
    return value


def load_env() -> Env:
    return Env(
        dv_env=os.getenv("DV_ENV", "dev"),
        tenant_id=_req("DV_TENANT_ID"),
        ingestion_id=_req("DV_INGESTION_ID"),
        bq_table=_req("DV_BQ_TABLE"),
        dataset=os.getenv("DV_DATASET", "default"),
        source=os.getenv("DV_SOURCE", "upload"),
        file_name=os.getenv("DV_FILE_NAME", "dataset.csv"),
    )
