from __future__ import annotations

from typing import Any

import httpx
from fastapi import HTTPException

from .settings import Settings


def resolve_me(settings: Settings, token: str) -> dict[str, Any]:
    if not settings.identity_api_base_url:
        raise HTTPException(status_code=500, detail="IDENTITY_API_BASE_URL is not configured")

    url = settings.identity_api_base_url.rstrip("/") + "/v1/me"
    try:
        r = httpx.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=5.0)
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

