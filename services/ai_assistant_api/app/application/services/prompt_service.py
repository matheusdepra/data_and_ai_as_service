from __future__ import annotations

from app.domain.ports.prompt_repository import PromptRepository


class PromptService:
    def __init__(self, prompt_repository: PromptRepository) -> None:
        self._prompt_repository = prompt_repository

    async def render_prompt(self, *, prompt_key: str, variables: dict) -> str:
        prompt = await self._prompt_repository.get_by_key(prompt_key)
        return prompt.render(variables)
