from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class MeResponse(BaseModel):
    sub: str
    email: str
    tenant_id: str
    role: str


class InviteCreateRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    role: str = Field(pattern="^(admin|viewer)$")


class InviteResponse(BaseModel):
    invite_id: str
    tenant_id: str
    email: str
    role: str
    status: str
    created_by: str
    created_at: datetime
    expires_at: datetime
    accepted_at: datetime | None = None
    revoked_at: datetime | None = None
    login_url: str

