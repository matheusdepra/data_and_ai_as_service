import { getIngestionOverview, getIngestionOverviewSemantic } from "@/ui/lib/api";
import { getJwt } from "@/ui/lib/storage";
import { datasetCopilotMock } from "../mocks/dataset-copilot.mock";
import type { DatasetCopilotData, DatasetCopilotSummary, DatasetRelationship } from "../types";

export async function getDatasetCopilotData(ingestionId?: string): Promise<DatasetCopilotData> {
  if (!ingestionId || ingestionId === "mock") {
    return Promise.resolve(datasetCopilotMock);
  }

  const jwt = getJwt();
  const [overviewRes, semanticRes] = await Promise.all([
    getIngestionOverview({ jwt, ingestionId }),
    getIngestionOverviewSemantic({ jwt, ingestionId }).catch(() => ({ semantic: {} })),
  ]);

  const overview = overviewRes.overview;
  if (!overview) {
    throw new Error("Overview data not available");
  }

  const ov = overview as any;
  const sem = (semanticRes.semantic || {}) as any;

  // Merge semantic values into overview values
  const datasetHeader = { ...ov.dataset_header, ...sem.dataset_header };
  const aiUnderstanding = { ...ov.ai_understanding, ...sem.ai_understanding };
  const summary = { ...ov.summary, ...sem.summary };
  const businessDescription = { ...ov.business_description, ...sem.business_description };

  const tags = datasetHeader.tags || [];

  const mappedSummary: DatasetCopilotSummary = {
    datasetName: datasetHeader.name || "Untitled Dataset",
    status: datasetHeader.status || overviewRes.status || "Ready",
    rows: summary.rows ? summary.rows.toLocaleString() : "0",
    columns: summary.columns || 0,
    size: summary.size_bytes ? formatSize(summary.size_bytes) : "0 B",
    qualityScore: overview.quality ? Math.round(overview.quality.overall_score * 100) : 100,
    lastUpdated: datasetHeader.updated_at
      ? formatTime(datasetHeader.updated_at)
      : overviewRes.ready_at
      ? formatTime(overviewRes.ready_at)
      : "Just now",
    description: aiUnderstanding.summary || "",
    domain: businessDescription.domain || "Unknown Domain",
    tags: tags,
  };

  const relationships: DatasetRelationship[] = (overview.relationships || []).map((r) => ({
    dataset: r.dataset_name,
    confidence: Math.round(r.confidence * 100),
    key: r.shared_columns?.join(", ") || "Unknown key",
  }));

  const suggestedOutputs = (businessDescription.typical_usage || []).map((u: string) => ({
    name: u,
    description: `analytical output related to ${u.toLowerCase()}`,
  }));

  return {
    summary: mappedSummary,
    quickActions: datasetCopilotMock.quickActions,
    suggestedPrompts: datasetCopilotMock.suggestedPrompts,
    messages: [], // Chat starts empty, populated by conversation page
    relationships,
    suggestedOutputs,
  };
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ", " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return isoString;
  }
}
