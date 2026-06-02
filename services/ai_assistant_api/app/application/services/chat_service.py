from __future__ import annotations

from collections.abc import Mapping
import json
import re
import time

from app.application.services.context_service import ContextService
from app.application.services.prompt_service import PromptService
from app.application.services.tool_service import ToolExecutionResult, ToolService
from app.domain.models.chat import ChatMessage, ChatRequestContext, ChatResponse, ChatRole, ChatScope, UserContext
from app.domain.ports.chat_history_repository import ChatHistoryRepository
from app.domain.ports.llm_provider import LLMProvider


class ChatService:
    def __init__(
        self,
        *,
        prompt_service: PromptService,
        context_service: ContextService,
        history_repository: ChatHistoryRepository,
        llm_provider: LLMProvider,
        tool_service: ToolService,
        history_limit: int = 20,
    ) -> None:
        self._prompt_service = prompt_service
        self._context_service = context_service
        self._history_repository = history_repository
        self._llm_provider = llm_provider
        self._tool_service = tool_service
        self._history_limit = history_limit

    async def send_message(
        self,
        *,
        session_id: str,
        user: UserContext,
        message: str,
        prompt_key: str,
        request_context: ChatRequestContext,
        request_scope: ChatScope,
        request_headers: Mapping[str, str],
    ) -> ChatResponse:
        started = time.perf_counter()
        history = await self._history_repository.list_messages(
            session_id=session_id,
            user=user,
            limit=self._history_limit,
        )
        user_message = ChatMessage(role=ChatRole.USER, content=message)
        tool_response = await self._tool_service.maybe_handle_dataset_overview_turn(
            user=user,
            message=message,
            request_scope=request_scope,
            request_headers=request_headers,
            history=history,
        )
        if tool_response is not None and tool_response.direct_response and tool_response.response_text is not None:
            assistant_message = ChatMessage(
                role=ChatRole.ASSISTANT,
                content=tool_response.response_text,
                metadata={
                    "model": "tool-service",
                    **tool_response.metadata,
                },
            )
            await self._history_repository.append_messages(
                session_id=session_id,
                user=user,
                messages=[user_message, assistant_message],
            )
            latency_ms = int((time.perf_counter() - started) * 1000)
            return ChatResponse(
                session_id=session_id,
                answer=tool_response.response_text,
                used_prompt_key=prompt_key,
                used_context_sources=tool_response.sources,
                metadata={
                    "model": "tool-service",
                    "latency_ms": latency_ms,
                    **tool_response.metadata,
                },
            )

        retrieved_context = await self._context_service.retrieve_context(
            user=user,
            request_context=request_context,
            request_scope=request_scope,
            request_headers=request_headers,
        )
        system_prompt = await self._prompt_service.render_prompt(
            prompt_key=prompt_key,
            variables={
                "user_id": user.user_id,
                "tenant_id": user.tenant_id,
                "context": retrieved_context.content,
            },
        )
        messages = [ChatMessage(role=ChatRole.SYSTEM, content=system_prompt), *history, user_message]
        if tool_response is not None:
            messages.extend(self._tool_messages(tool_response))
        llm_response = await self._llm_provider.generate(messages)
        
        answer_text, rich_meta = _extract_rich_metadata(llm_response.content)
        
        response_metadata = {
            "model": llm_response.model,
            **llm_response.metadata,
            **(tool_response.metadata if tool_response is not None else {}),
        }
        if rich_meta:
            response_metadata.update(rich_meta)

        assistant_message = ChatMessage(
            role=ChatRole.ASSISTANT,
            content=answer_text,
            metadata=response_metadata,
        )
        await self._history_repository.append_messages(
            session_id=session_id,
            user=user,
            messages=[user_message, assistant_message],
        )
        latency_ms = int((time.perf_counter() - started) * 1000)
        
        return ChatResponse(
            session_id=session_id,
            answer=answer_text,
            used_prompt_key=prompt_key,
            used_context_sources=retrieved_context.sources + (tool_response.sources if tool_response is not None else []),
            metadata={
                "latency_ms": latency_ms,
                **response_metadata,
            },
        )


    def _tool_messages(self, result: ToolExecutionResult) -> list[ChatMessage]:
        return [
            ChatMessage(
                role=ChatRole.SYSTEM,
                content=(
                    "A tool was executed for this turn. Use the tool result as trusted internal evidence. "
                    "Never expose raw JSON, tool schemas, metadata keys, or code fences for semantic previews. "
                    "If the tool result includes response_language, answer in that language. "
                    "If the tool produced a preview, summarize the proposed field changes in plain language "
                    "and always ask whether the user wants to apply/save them. "
                    "If the tool applied a semantic change, state that it was persisted and that technical facts were not changed."
                ),
            ),
            ChatMessage(role=ChatRole.TOOL, content=result.llm_context, metadata=result.metadata),
        ]


def _extract_rich_metadata(content: str) -> tuple[str, dict[str, Any]]:
    pattern = r"```json\s*(\{.*?\})\s*```"
    matches = list(re.finditer(pattern, content, re.DOTALL))
    for match in reversed(matches):
        raw_json = match.group(1)
        try:
            parsed = json.loads(raw_json)
            rich = None
            if "rich_metadata" in parsed:
                rich = parsed["rich_metadata"]
            elif "kind" in parsed:
                rich = parsed
            
            if isinstance(rich, dict) and "kind" in rich:
                # Remove this specific code block from the content
                cleaned_content = content[:match.start()].strip() + "\n\n" + content[match.end():].strip()
                return cleaned_content.strip(), rich
        except Exception:
            continue
            
    return content, {}

