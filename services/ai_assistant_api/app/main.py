from __future__ import annotations

import logging
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes import chat, health
from app.core.config import get_settings
from app.core.errors import register_error_handlers
from app.core.logging import configure_logging

settings = get_settings()
configure_logging(settings.log_level)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    register_error_handlers(app)
    app.include_router(health.router)
    app.include_router(chat.router, prefix=settings.api_prefix)

    @app.middleware("http")
    async def request_logging(request: Request, call_next):
        request_id = request.headers.get("x-request-id") or str(uuid4())
        started = perf_counter()
        response = await call_next(request)
        latency_ms = int((perf_counter() - started) * 1000)
        response.headers["x-request-id"] = request_id
        logger.info(
            "request completed",
            extra={
                "dv_request_id": request_id,
                "dv_method": request.method,
                "dv_path": request.url.path,
                "dv_status_code": response.status_code,
                "dv_latency_ms": latency_ms,
            },
        )
        return response

    return app


app = create_app()
