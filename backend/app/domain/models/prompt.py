from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel, Field


_VARIABLE_PATTERN = re.compile(r"{([a-zA-Z_][a-zA-Z0-9_]*)}")


class PromptTemplate(BaseModel):
    key: str
    template: str
    description: str | None = None
    default_variables: dict[str, Any] = Field(default_factory=dict)

    @property
    def variables(self) -> set[str]:
        return set(_VARIABLE_PATTERN.findall(self.template))

    def render(self, variables: dict[str, Any]) -> str:
        merged = {**self.default_variables, **variables}
        missing = sorted(name for name in self.variables if name not in merged)
        if missing:
            raise ValueError(f"Missing prompt variables: {', '.join(missing)}")
        return self.template.format(**merged)
