from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

import httpx
import google.auth.transport.requests
from google.oauth2 import id_token
from fastapi import HTTPException, Request

from .settings import Settings


def _needs_cloud_run_identity_token(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme == "https" and parsed.hostname is not None and parsed.hostname.endswith(".run.app")


def _cloud_run_identity_token(audience: str) -> str:
    request = google.auth.transport.requests.Request()
    return id_token.fetch_id_token(request, audience)


def resolve_me(settings: Settings, request: Request) -> dict[str, Any]:
    if not settings.identity_api_base_url:
        raise HTTPException(status_code=500, detail="IDENTITY_API_BASE_URL is not configured")

    base_url = settings.identity_api_base_url.rstrip("/")
    url = base_url + "/v1/me"
    headers: dict[str, str] = {}

    user_authorization = (
        request.headers.get("x-forwarded-authorization")
        or request.headers.get("X-Forwarded-Authorization")
        or request.headers.get("authorization")
        or request.headers.get("Authorization")
    )
    if user_authorization:
        headers["X-Forwarded-Authorization"] = user_authorization

    gateway_userinfo = (
        request.headers.get("x-apigateway-api-userinfo")
        or request.headers.get("X-Apigateway-Api-Userinfo")
    )
    if gateway_userinfo:
        headers["X-Apigateway-Api-Userinfo"] = gateway_userinfo

    if not headers:
        raise HTTPException(status_code=401, detail="missing auth context")

    if _needs_cloud_run_identity_token(base_url):
        try:
            headers["Authorization"] = f"Bearer {_cloud_run_identity_token(base_url)}"
        except Exception:
            raise HTTPException(status_code=502, detail="identity-api invocation auth unavailable")
    try:
        r = httpx.get(url, headers=headers, timeout=5.0)
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="identity-api unavailable")

    if r.status_code != 200:
        # Bubble up authn/authz errors (401/403) to the client.
        try:
            body = r.json()
        except Exception:
            body = None
        if isinstance(body, dict) and "detail" in body:
            raise HTTPException(status_code=r.status_code, detail=str(body["detail"]))
        raise HTTPException(status_code=r.status_code, detail="identity-api error")

    try:
        data = r.json()
    except Exception:
        raise HTTPException(status_code=502, detail="identity-api invalid response")
    if not isinstance(data, dict):
        raise HTTPException(status_code=502, detail="identity-api invalid response")
    return data
