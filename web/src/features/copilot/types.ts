export type CopilotMessageKind = "explanation" | "quality" | "glossary" | "relationships" | "suggestions";

export type GlossaryTerm = {
  term: string;
  definition: string;
  dataType: string;
  example: string;
};

export type DatasetRelationship = {
  dataset: string;
  confidence: number;
  key: string;
};

export type DatasetCopilotMessage = {
  id: string;
  role: "assistant" | "user";
  kind?: CopilotMessageKind;
  title?: string;
  body: string;
  bullets?: string[];
  glossary?: GlossaryTerm[];
  relationships?: DatasetRelationship[];
  actions?: string[];
};

export type DatasetCopilotSummary = {
  datasetName: string;
  status: string;
  rows: string;
  columns: number;
  size: string;
  qualityScore: number;
  lastUpdated: string;
  description: string;
  domain: string;
  tags: string[];
};

export type DatasetCopilotData = {
  summary: DatasetCopilotSummary;
  quickActions: string[];
  suggestedPrompts: string[];
  messages: DatasetCopilotMessage[];
  relationships: DatasetRelationship[];
  suggestedOutputs: Array<{ name: string; description: string }>;
};
