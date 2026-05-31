export type WorkspaceAssetStatus = "Draft" | "Ready" | "Generating" | "Published";

export type WorkspaceDataset = {
  id: string;
  name: string;
  rows: string;
  columns: number;
  confidence: number;
  primaryKey: string;
  status: string;
  description: string;
};

export type WorkspaceRelationship = {
  id: string;
  source: string;
  target: string;
  key: string;
  confidence: number;
  type: "Approved" | "Suggested";
  reasoning: string;
};

export type WorkspaceOutput = {
  id: string;
  name: string;
  status: WorkspaceAssetStatus;
  confidence: number;
  sources: string[];
  expectedColumns: number;
  expectedRows: string;
  businessValue: string;
};

export type WorkspaceMessage = {
  id: string;
  role: "assistant" | "user";
  title?: string;
  body: string;
  details?: Array<{ label: string; value: string }>;
  actions?: string[];
};

export type WorkspaceIdea = {
  name: string;
  description: string;
};

export type WorkspaceData = {
  name: string;
  description: string;
  metadata: string;
  datasets: WorkspaceDataset[];
  relationships: WorkspaceRelationship[];
  outputs: WorkspaceOutput[];
  messages: WorkspaceMessage[];
  ideas: WorkspaceIdea[];
  suggestedPrompts: string[];
  previewRows: Array<Record<string, string | number>>;
};
