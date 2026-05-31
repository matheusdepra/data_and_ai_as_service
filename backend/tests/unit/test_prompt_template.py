from __future__ import annotations

import pytest

from app.domain.models.prompt import PromptTemplate


def test_prompt_template_renders_variables() -> None:
    template = PromptTemplate(key="test", template="Hello {name}, context: {context}")

    rendered = template.render({"name": "Ada", "context": "sales"})

    assert rendered == "Hello Ada, context: sales"


def test_prompt_template_requires_missing_variables() -> None:
    template = PromptTemplate(key="test", template="Hello {name}")

    with pytest.raises(ValueError, match="Missing prompt variables: name"):
        template.render({})
