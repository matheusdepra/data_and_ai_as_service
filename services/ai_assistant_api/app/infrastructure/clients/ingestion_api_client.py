from __future__ import annotations

import json
from collections.abc import Mapping
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import Settings, get_settings
from app.core.errors import NotFoundError, ProviderError


class IngestionApiClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    def get_json(self, *, path: str, request_headers: Mapping[str, str], allow_not_found: bool = False) -> dict[str, object]:
        return self._request_json(
            method="GET",
            path=path,
            request_headers=request_headers,
            allow_not_found=allow_not_found,
        )

    def post_json(
        self,
        *,
        path: str,
        payload: dict[str, object],
        request_headers: Mapping[str, str],
        allow_not_found: bool = False,
    ) -> dict[str, object]:
        return self._request_json(
            method="POST",
            path=path,
            request_headers=request_headers,
            payload=payload,
            allow_not_found=allow_not_found,
        )

    def patch_json(
        self,
        *,
        path: str,
        payload: dict[str, object],
        request_headers: Mapping[str, str],
        if_match: str | None = None,
        allow_not_found: bool = False,
    ) -> dict[str, object]:
        return self._request_json(
            method="PATCH",
            path=path,
            request_headers=request_headers,
            payload=payload,
            if_match=if_match,
            allow_not_found=allow_not_found,
        )

    def _request_json(
        self,
        *,
        method: str,
        path: str,
        request_headers: Mapping[str, str],
        payload: dict[str, object] | None = None,
        if_match: str | None = None,
        allow_not_found: bool = False,
    ) -> dict[str, object]:
        base_url = (self._settings.ingestion_api_base_url or "").rstrip("/")
        if not base_url:
            raise ProviderError("CHAT_INGESTION_API_BASE_URL is required")

        headers = self._build_forward_headers(request_headers)
        data: bytes | None = None
        if payload is not None:
            headers["content-type"] = "application/json"
            data = json.dumps(payload).encode("utf-8")
        if if_match:
            headers["if-match"] = if_match

        request = Request(f"{base_url}{path}", headers=headers, data=data, method=method)
        timeout = float(self._settings.ingestion_api_timeout_seconds)
        try:
            with urlopen(request, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            if allow_not_found and exc.code == 404:
                return {}
            body = exc.read().decode("utf-8", errors="replace")
            if exc.code == 404:
                raise NotFoundError("Resource not found in ingestion-api", details={"path": path}) from exc
            raise ProviderError(
                "Failed to call ingestion-api",
                details={"path": path, "status_code": exc.code, "body": body[:1000]},
            ) from exc
        except URLError as exc:
            raise ProviderError("Could not reach ingestion-api", details={"path": path}) from exc

    def _build_forward_headers(self, request_headers: Mapping[str, str]) -> dict[str, str]:
        normalized = {key.lower(): value for key, value in request_headers.items()}
        forwarded: dict[str, str] = {"accept": "application/json"}
        for key in (
            "authorization",
            "x-api-key",
            "x-forwarded-authorization",
            "x-cloud-trace-context",
            "x-request-id",
            "x-user-id",
            "x-user-role",
            "x-user-email",
            "x-dev-tenant-id",
        ):
            value = normalized.get(key)
            if value:
                forwarded[key] = value
        return forwarded
