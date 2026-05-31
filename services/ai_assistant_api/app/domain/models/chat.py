from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class ChatRole(StrEnum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class ChatMessage(BaseModel):
    role: ChatRole
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class ChatRequestContext(BaseModel):
    dataset: str | None = None
    tables: list[str] = Field(default_factory=list)
    filters: dict[str, Any] = Field(default_factory=dict)


class UserContext(BaseModel):
    user_id: str
    tenant_id: str
    role: str = "viewer"
    email: str | None = None


class ChatResponse(BaseModel):
    session_id: str
    answer: str
    used_prompt_key: str
    used_context_sources: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class LLMResponse(BaseModel):
    content: str
    model: str
    usage: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)
