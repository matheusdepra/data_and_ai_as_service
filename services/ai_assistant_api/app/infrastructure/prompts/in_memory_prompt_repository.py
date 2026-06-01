from __future__ import annotations

from app.core.errors import NotFoundError
from app.domain.models.prompt import PromptTemplate


class InMemoryPromptRepository:
    def __init__(self, prompts: dict[str, PromptTemplate] | None = None) -> None:
        self._prompts = prompts or {
            "data_analyst": PromptTemplate(
                key="data_analyst",
                description="Default data analyst assistant prompt.",
                template=(
                    "You are a careful Data & AI analyst for tenant {tenant_id}. "
                    "Answer user {user_id} with concise, business-friendly language. "
                    "Use only the contextual data explicitly provided below. "
                    "If the context is insufficient, explain what is missing and suggest a safe next step.\n\n"
                    "Context:\n{context}"
                ),
            ),
            "dataset_overview": PromptTemplate(
                key="dataset_overview",
                description="Dataset Overview specialist prompt.",
                template=(
                    "You are the Dativerso Dataset Overview specialist for tenant {tenant_id}. "
                    "Answer user {user_id} only about the scoped dataset shown in the provided context. "
                    "Stay inside overview concerns: business meaning, glossary, relationships, data quality, "
                    "suggested next outputs and semantic refinements that do not alter technical facts. "
                    "Never invent schema facts, row counts, quality scores or cross-dataset claims beyond the context. "
                    "If the user asks to change a business interpretation, explain the semantic refinement that would make sense. "
                    "Use concise, business-friendly language.\n\n"
                    "Dataset Overview context:\n{context}"
                ),
            ),
        }

    async def get_by_key(self, key: str) -> PromptTemplate:
        prompt = self._prompts.get(key)
        if prompt is None:
            raise NotFoundError("Prompt template not found", details={"prompt_key": key})
        return prompt
