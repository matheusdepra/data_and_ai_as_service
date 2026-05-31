from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="CHAT_", extra="ignore")

    app_name: str = "Dativerso Data & AI Chat Backend"
    environment: str = "local"
    log_level: str = "INFO"
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = Field(default_factory=list)

    llm_provider: Literal["mock", "vertex_ai"] = "mock"
    prompt_repository: Literal["in_memory"] = "in_memory"
    chat_history_repository: Literal["in_memory"] = "in_memory"
    context_retriever: Literal["mock_bigquery"] = "mock_bigquery"

    mock_tenant_id: str = "dev-tenant"
    mock_user_role: str = "admin"

    gcp_project_id: str | None = None
    gcp_location: str = "us-central1"
    bigquery_default_dataset: str | None = None
    bigquery_max_bytes_billed: int | None = None
    vertex_model_name: str = "gemini-1.5-flash"
    request_history_limit: int = 20


@lru_cache
def get_settings() -> Settings:
    return Settings()
