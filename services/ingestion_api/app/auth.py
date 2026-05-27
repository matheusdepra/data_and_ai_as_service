from __future__ import annotations

import base64
import json
from typing import Any

import jwt
from fastapi import HTTPException, Request

from .settings import Settings


_jwks_clients: dict[str, jwt.PyJWKClient] = {}


def _b64url_decode(s: str) -> bytes:
    padding = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + padding)


def _decode_unverified(token: str) -> dict[str, Any]:
    # WARNING: Do not use in production unless token authenticity is guaranteed by a trusted gateway.
    parts = token.split(".")
    if len(parts) < 2:
        raise ValueError("invalid JWT format")
    payload = json.loads(_b64url_decode(parts[1]).decode("utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("invalid JWT payload")
    return payload


def get_bearer_token(request: Request) -> str:
    # When fronted by API Gateway / ESP, the original client Authorization header may be forwarded
    # as X-Forwarded-Authorization while Authorization is overwritten for service-to-service auth.
    auth = (
        request.headers.get("x-forwarded-authorization")
        or request.headers.get("X-Forwarded-Authorization")
        or request.headers.get("authorization")
        or request.headers.get("Authorization")
    )
    if not auth:
        raise HTTPException(status_code=401, detail="missing Authorization header")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="invalid Authorization scheme")
    return auth.split(" ", 1)[1].strip()


def get_gateway_claims(request: Request) -> dict[str, Any] | None:
    raw = (
        request.headers.get("x-apigateway-api-userinfo")
        or request.headers.get("X-Apigateway-Api-Userinfo")
    )
    if not raw:
        return None
    try:
        decoded = json.loads(_b64url_decode(raw).decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=401, detail="invalid gateway auth header")
    if not isinstance(decoded, dict):
        raise HTTPException(status_code=401, detail="invalid gateway auth header")
    return decoded


def get_claims(settings: Settings, token: str) -> dict[str, Any]:
    if settings.auth_mode == "unverified_jwt":
        try:
            return _decode_unverified(token)
        except Exception:
            raise HTTPException(status_code=401, detail="invalid token")

    if settings.auth_mode == "oidc_jwks":
        if not settings.auth_jwks_url or not settings.auth_issuer or not settings.auth_audience:
            raise HTTPException(
                status_code=500,
                detail="server auth misconfigured (AUTH_JWKS_URL/AUTH_ISSUER/AUTH_AUDIENCE)",
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
                options={"require": ["exp", "iss", "aud"]},
            )
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="invalid token")

    raise HTTPException(status_code=500, detail=f"unsupported AUTH_MODE={settings.auth_mode}")


def get_tenant_id(settings: Settings, claims: dict[str, Any]) -> str:
    raw = claims.get(settings.auth_tenant_claim)
    if not raw or not isinstance(raw, str):
        raise HTTPException(status_code=403, detail="tenant claim missing")
    tenant_id = raw.strip()
    if not tenant_id:
        raise HTTPException(status_code=403, detail="tenant claim empty")
    return tenant_id
