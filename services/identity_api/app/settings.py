from __future__ import annotations

from dataclasses import dataclass
import os


FIREBASE_SECURETOKEN_JWKS_URL_DEFAULT = (
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
)


@dataclass(frozen=True)
class Settings:
    dv_env: str

    # Auth
    auth_mode: str
    auth_jwks_url: str | None
    auth_issuer: str | None
    auth_audience: str | None
    firebase_project_id: str | None

    # Firestore
    firestore_project_id: str | None

    # UI/links
    frontend_base_url: str


def load_settings() -> Settings:
    dv_env = os.getenv("DV_ENV", "dev")

    firebase_project_id = os.getenv("FIREBASE_PROJECT_ID") or None

    auth_mode = os.getenv("AUTH_MODE", "oidc_jwks")
    auth_jwks_url = os.getenv("AUTH_JWKS_URL") or None
    auth_issuer = os.getenv("AUTH_ISSUER") or None
    auth_audience = os.getenv("AUTH_AUDIENCE") or None

    # Convenience defaults for Firebase ID tokens. These are still configurable via env.
    if firebase_project_id and not auth_jwks_url:
        auth_jwks_url = FIREBASE_SECURETOKEN_JWKS_URL_DEFAULT
    if firebase_project_id and not auth_issuer:
        auth_issuer = f"https://securetoken.google.com/{firebase_project_id}"
    if firebase_project_id and not auth_audience:
        auth_audience = firebase_project_id

    firestore_project_id = os.getenv("FIRESTORE_PROJECT_ID") or None

    frontend_base_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")

    return Settings(
        dv_env=dv_env,
        auth_mode=auth_mode,
        auth_jwks_url=auth_jwks_url,
        auth_issuer=auth_issuer,
        auth_audience=auth_audience,
        firebase_project_id=firebase_project_id,
        firestore_project_id=firestore_project_id,
        frontend_base_url=frontend_base_url,
    )

