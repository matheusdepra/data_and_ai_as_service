import type { IngestionDetail, IngestionOverviewResponse } from "@/ui/lib/api";

import { overviewCopilotPrompts } from "../mocks/overview-copilot.mock";
import type { OverviewCopilotContext, OverviewCopilotMessage, SuggestedOutput } from "../types";

export function buildOverviewCopilotContext(args: {
  ingestionId: string;
  detail: IngestionDetail | null;
  overview: IngestionOverviewResponse | null;
  fallbackStatus: string;
}): OverviewCopilotContext {
  const { ingestionId, detail, overview, fallbackStatus } = args;
  const datasetHeader = overview?.overview?.dataset_header;
  const summary = overview?.overview?.summary;
  const quality = overview?.overview?.quality;
  const business = overview?.overview?.business_description;
  const relationships = overview?.overview?.relationships || [];
  const terms = overview?.overview?.terms || [];
  const schemaColumns = overview?.overview?.schema?.columns || [];
  const tags = datasetHeader?.tags || [];

  const schemaWarnings = schemaColumns
    .flatMap((column) => (column.warnings || []).map((warning) => `${humanize(column.normalized_name)}: ${warning}`))
    .slice(0, 5);

  return {
    ingestionId,
    datasetName: datasetHeader?.name || humanize(detail?.ingestion.collection_slug || detail?.ingestion.dataset || "dataset"),
    classification: datasetHeader?.classification || friendlyStatusLabel(detail?.ingestion.status || fallbackStatus),
    statusLabel: friendlyStatusLabel(detail?.ingestion.status || fallbackStatus),
    sourceLabel: humanize(detail?.ingestion.source || "upload"),
    tableName: detail?.ingestion.technical_summary?.bq_table || "-",
    language: summary?.language || "-",
    createdAt: formatDateTime(summary?.created_date),
    updatedAt: relativeTime(datasetHeader?.updated_at || detail?.ingestion.updated_at),
    rows: summary?.rows?.toLocaleString() || "-",
    columns: String(summary?.columns ?? "-"),
    size: formatBytes(summary?.size_bytes),
    qualityScore: quality ? `${Math.round(quality.overall_score * 100)}%` : "-",
    confidence: overview?.overview?.ai_understanding ? `${Math.round(overview.overview.ai_understanding.confidence * 100)}%` : "-",
    understanding:
      overview?.overview?.ai_understanding?.summary || "Dativerso is still preparing the business understanding for this dataset.",
    businessArea: business?.business_area || "-",
    domain: business?.domain || "-",
    dataType: business?.data_type || "-",
    usage: business?.typical_usage || [],
    tags,
    terms,
    relationships: relationships.map((relationship) => ({
      datasetName: relationship.dataset_name,
      confidence: Math.round(relationship.confidence * 100),
      sharedColumns: relationship.shared_columns.map(humanize),
    })),
    qualityMetrics: [
      { label: "Overall Score", value: quality ? `${Math.round(quality.overall_score * 100)}%` : "-", emphasis: "High Quality" },
      { label: "Completeness", value: quality ? `${Math.round(quality.completeness * 100)}%` : "-" },
      { label: "Uniqueness", value: quality ? `${Math.round(quality.uniqueness * 100)}%` : "-" },
      { label: "Validity", value: quality ? `${Math.round(quality.validity * 100)}%` : "-" },
      { label: "Consistency", value: quality ? `${Math.round(quality.consistency * 100)}%` : "-" },
      { label: "Timeliness", value: quality ? `${Math.round(quality.timeliness * 100)}%` : "-" },
    ],
    schemaWarnings,
    suggestedOutputs: buildSuggestedOutputs({
      datasetName: datasetHeader?.name || humanize(detail?.ingestion.collection_slug || detail?.ingestion.dataset || "dataset"),
      domain: business?.domain || "Analytics",
      dataType: business?.data_type || "Dataset",
      relationships: relationships.length,
    }),
  };
}

export function createOverviewCopilotWelcome(context: OverviewCopilotContext): OverviewCopilotMessage {
  return {
    id: `assistant-welcome-${context.ingestionId}`,
    role: "assistant",
    title: `${context.datasetName} Copilot`,
    body: `I can explain business context, quality issues, terms, relationships and likely outputs for ${context.datasetName}.`,
    bullets: [
      `Current status: ${context.statusLabel}`,
      `Business classification: ${context.classification}`,
      `Quality score: ${context.qualityScore}`,
    ],
  };
}

export async function getOverviewCopilotReply(args: {
  context: OverviewCopilotContext;
  question: string;
}): Promise<OverviewCopilotMessage> {
  const { context, question } = args;
  const normalized = question.trim().toLowerCase();

  if (!normalized) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      title: "Ask about the dataset",
      body: "Try asking about business context, relationships, data quality or suggested outputs.",
      bullets: overviewCopilotPrompts,
    };
  }

  if (includesAny(normalized, ["quality", "warning", "issue", "problem", "problema", "qualidade"])) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      title: "Quality review",
      body: `${context.datasetName} is currently assessed at ${context.qualityScore}. The strongest signal is validity, while the weakest areas deserve remediation before broader reuse.`,
      bullets: [
        ...context.qualityMetrics.slice(1).map((metric) => `${metric.label}: ${metric.value}`),
        ...(context.schemaWarnings.length ? context.schemaWarnings : ["No explicit schema warnings were generated in the current overview."]),
      ],
    };
  }

  if (includesAny(normalized, ["relationship", "related", "join", "contract", "orders", "relacion"])) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      title: "Relationship analysis",
      body:
        context.relationships.length > 0
          ? `${context.datasetName} already has detected relationships that can accelerate asset creation without starting from raw joins.`
          : `No strong cross-dataset relationship was inferred yet for ${context.datasetName}.`,
      bullets:
        context.relationships.length > 0
          ? context.relationships.map(
              (relationship) =>
                `${relationship.datasetName}: ${relationship.confidence}% confidence via ${relationship.sharedColumns.join(", ")}`,
            )
          : ["Use Copilot again after more tenant datasets are processed to improve relationship discovery."],
    };
  }

  if (includesAny(normalized, ["term", "glossary", "business term", "meaning", "campo", "column", "schema"])) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      title: "Business meaning",
      body: `${context.datasetName} is being framed as ${context.dataType} for the ${context.businessArea} area. The most relevant concepts extracted so far are listed below.`,
      bullets: context.terms.length > 0 ? context.terms : ["No business terms have been extracted yet from the current overview."],
    };
  }

  if (includesAny(normalized, ["output", "build", "dashboard", "analytic", "analytics", "workspace"])) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      title: "Suggested outputs",
      body: `Based on the current understanding of ${context.datasetName}, these are the most plausible next assets to create in Workspace.`,
      bullets: context.suggestedOutputs.map(
        (output) => `${output.name}: ${output.description} (${output.confidence}% confidence)`,
      ),
    };
  }

  if (includesAny(normalized, ["maior numero de clientes", "top", "highest", "rank", "cliente"])) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      title: "Analytical query guidance",
      body: "This overview can explain what the dataset represents, but it does not run ad hoc analytical ranking yet.",
      bullets: [
        "Use Dataset Copilot to clarify fields such as customer identifiers, segments and relationship keys.",
        "Open Workspace when you want to combine this dataset with others and generate ranked outputs or dashboards.",
        `Current table reference: ${context.tableName}`,
      ],
    };
  }

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    title: "Dataset context",
    body: context.understanding,
    bullets: [
      `Business area: ${context.businessArea}`,
      `Domain: ${context.domain}`,
      `Typical usage: ${context.usage.join(", ") || "-"}`,
      `Rows: ${context.rows} • Columns: ${context.columns} • Updated: ${context.updatedAt}`,
    ],
  };
}

function buildSuggestedOutputs(args: {
  datasetName: string;
  domain: string;
  dataType: string;
  relationships: number;
}): SuggestedOutput[] {
  const { datasetName, domain, dataType, relationships } = args;
  return [
    {
      name: `${datasetName} 360`,
      description: `Unified ${domain.toLowerCase()} view for business users with governed fields and context.`,
      confidence: relationships > 0 ? 89 : 78,
    },
    {
      name: `${domain} Analytics`,
      description: `Reusable analytical layer to support dashboards, segmentation and monitoring around this ${dataType.toLowerCase()}.`,
      confidence: 76,
    },
    {
      name: `Curated ${datasetName}`,
      description: "Business-ready table with clearer naming, glossary coverage and quality remediation actions.",
      confidence: 83,
    },
  ];
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function friendlyStatusLabel(status: string) {
  switch (status) {
    case "silver_ready":
      return "Ready to use";
    case "bronze_ready":
      return "Ready with warnings";
    case "silver_failed":
    case "bronze_failed":
      return "Needs attention";
    default:
      return humanize(status || "pending");
  }
}

function humanize(value?: string | null): string {
  if (!value) return "-";
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function relativeTime(value?: string | null): string {
  if (!value) return "-";
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function formatBytes(value?: number | null): string {
  if (!value || value <= 0) return "-";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
