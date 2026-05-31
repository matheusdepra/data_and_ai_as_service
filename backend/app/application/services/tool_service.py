from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ToolDescriptor:
    name: str
    description: str


class ToolService:
    """Registry placeholder for future Data & AI tools.

    Tools are intentionally not coupled to the LLM provider. Future expansion can
    implement planning/function-calling while keeping BigQuery and metadata
    access behind application services and domain ports.
    """

    def list_available_tools(self) -> list[ToolDescriptor]:
        return [
            ToolDescriptor(name="query_bigquery", description="Run a tenant-authorized BigQuery query."),
            ToolDescriptor(
                name="summarize_dataset",
                description="Summarize dataset shape, quality, and business meaning.",
            ),
            ToolDescriptor(name="explain_metric", description="Explain a metric definition and caveats."),
            ToolDescriptor(name="generate_sql", description="Generate SQL for a business question."),
            ToolDescriptor(name="validate_sql", description="Validate SQL before execution."),
            ToolDescriptor(name="retrieve_metadata", description="Retrieve catalog and lineage metadata."),
        ]
