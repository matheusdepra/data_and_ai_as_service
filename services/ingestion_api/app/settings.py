from __future__ import annotations

from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    dv_env: str
    gcs_landing_bucket: str
    auth_mode: str
    auth_tenant_claim: str
    auth_jwks_url: str | None
    auth_issuer: str | None
    auth_audience: str | None
    bq_meta_dataset: str
    identity_api_base_url: str | None
    overviewify_job_name: str | None


def load_settings() -> Settings:
    dv_env = os.getenv("DV_ENV", "dev")
    gcs_landing_bucket = os.getenv("GCS_LANDING_BUCKET", "")
    auth_mode = os.getenv("AUTH_MODE", "oidc_jwks")
    auth_tenant_claim = os.getenv("AUTH_TENANT_CLAIM", "tenant_id")
    auth_jwks_url = os.getenv("AUTH_JWKS_URL")
    auth_issuer = os.getenv("AUTH_ISSUER")
    auth_audience = os.getenv("AUTH_AUDIENCE")
    bq_meta_dataset = os.getenv("BQ_META_DATASET") or f"dv_{dv_env}_meta"
    identity_api_base_url = (os.getenv("IDENTITY_API_BASE_URL") or "").strip() or None
    overviewify_job_name = (os.getenv("OVERVIEWIFY_JOB_NAME") or "").strip() or None

    return Settings(
        dv_env=dv_env,
        gcs_landing_bucket=gcs_landing_bucket,
        auth_mode=auth_mode,
        auth_tenant_claim=auth_tenant_claim,
        auth_jwks_url=auth_jwks_url,
        auth_issuer=auth_issuer,
        auth_audience=auth_audience,
        bq_meta_dataset=bq_meta_dataset,
        identity_api_base_url=identity_api_base_url,
        overviewify_job_name=overviewify_job_name,
    )
