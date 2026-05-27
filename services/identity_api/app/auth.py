from __future__ import annotations

from typing import Any

import jwt
from fastapi import HTTPException, Request

from .settings import Settings


_jwks_clients: dict[str, jwt.PyJWKClient] = {}


def get_bearer_token(request: Request) -> str:
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth:
        raise HTTPException(status_code=401, detail="missing Authorization header")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="invalid Authorization scheme")
    return auth.split(" ", 1)[1].strip()


def get_claims(settings: Settings, token: str) -> dict[str, Any]:
    if settings.auth_mode != "oidc_jwks":
        raise HTTPException(status_code=500, detail=f"unsupported AUTH_MODE={settings.auth_mode}")

    if not settings.auth_jwks_url or not settings.auth_issuer or not settings.auth_audience:
        raise HTTPException(
            status_code=500,
            detail="server auth misconfigured (AUTH_JWKS_URL/AUTH_ISSUER/AUTH_AUDIENCE or FIREBASE_PROJECT_ID)",
        )

    try:
        jwks_client = _jwks_clients.get(settings.auth_jwks_url)
        if jwks_client is None:
            jwks_client = jwt.PyJWKClient(settings.auth_jwks_url)
            _jwks_clients[settings.auth_jwks_url] = jwks_client
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            issuer=settings.auth_issuer,
            audience=settings.auth_audience,
            options={"require": ["exp", "iss", "aud", "sub"]},
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="invalid token")


def require_str_claim(claims: dict[str, Any], key: str) -> str:
    raw = claims.get(key)
    if not raw or not isinstance(raw, str):
        raise HTTPException(status_code=401, detail=f"missing {key}")
    v = raw.strip()
    if not v:
        raise HTTPException(status_code=401, detail=f"empty {key}")
    return v

