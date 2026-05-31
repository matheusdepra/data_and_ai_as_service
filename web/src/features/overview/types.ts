export type OverviewCopilotRole = "assistant" | "user";

export type OverviewCopilotMessage = {
  id: string;
  role: OverviewCopilotRole;
  title?: string;
  body: string;
  bullets?: string[];
};

export type SuggestedOutput = {
  name: string;
  description: string;
  confidence: number;
};

export type OverviewCopilotContext = {
  ingestionId: string;
  datasetName: string;
  classification: string;
  statusLabel: string;
  sourceLabel: string;
  tableName: string;
  language: string;
  createdAt: string;
  updatedAt: string;
  rows: string;
  columns: string;
  size: string;
  qualityScore: string;
  confidence: string;
  understanding: string;
  businessArea: string;
  domain: string;
  dataType: string;
  usage: string[];
  tags: string[];
  terms: string[];
  relationships: Array<{
    datasetName: string;
    confidence: number;
    sharedColumns: string[];
  }>;
  qualityMetrics: Array<{
    label: string;
    value: string;
    emphasis?: string;
  }>;
  schemaWarnings: string[];
  suggestedOutputs: SuggestedOutput[];
};
