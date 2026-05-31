from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from app.api.v1.deps import get_send_chat_message_use_case
from app.application.use_cases.send_chat_message import SendChatMessageCommand, SendChatMessageUseCase
from app.domain.models.chat import ChatRequestContext


class ChatMessageRequest(BaseModel):
    session_id: str = Field(min_length=1)
    user_id: str | None = Field(default=None, min_length=1)
    message: str = Field(min_length=1)
    prompt_key: str = Field(default="data_analyst", min_length=1)
    context: ChatRequestContext = Field(default_factory=ChatRequestContext)


class ChatMessageResponse(BaseModel):
    session_id: str
    answer: str
    used_prompt_key: str
    used_context_sources: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/messages", response_model=ChatMessageResponse)
async def send_chat_message(
    request: Request,
    payload: ChatMessageRequest,
    use_case: Annotated[SendChatMessageUseCase, Depends(get_send_chat_message_use_case)],
) -> ChatMessageResponse:
    result = await use_case.execute(command=SendChatMessageCommand(**payload.model_dump()), headers=request.headers)
    return ChatMessageResponse(**result.model_dump())
