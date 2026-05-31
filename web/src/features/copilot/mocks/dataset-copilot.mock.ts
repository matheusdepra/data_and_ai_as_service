import type { DatasetCopilotData } from "../types";

export const datasetCopilotMock: DatasetCopilotData = {
  summary: {
    datasetName: "Customer Master",
    status: "Ready to use",
    rows: "12,340",
    columns: 42,
    size: "18.4 MB",
    qualityScore: 92,
    lastUpdated: "Today, 10:42",
    description: "Unified customer profile with lifecycle, contactability and account attributes for commercial analysis.",
    domain: "Customer Operations",
    tags: ["Customers", "CRM", "Commercial"],
  },
  quickActions: [
    "What is this dataset about?",
    "Identify quality problems.",
    "Create business glossary.",
    "Show related datasets.",
    "Recommend analytical outputs.",
    "Explain column meanings.",
  ],
  suggestedPrompts: [
    "What are the most important columns?",
    "What quality issues exist?",
    "What datasets can be related?",
    "Explain this dataset to a business user.",
  ],
  messages: [
    {
      id: "msg-1",
      role: "assistant",
      kind: "explanation",
      title: "Dataset summary",
      body: "This dataset represents the current customer master used by commercial and operations teams. It is suitable for segmentation, account health and customer 360 initiatives.",
      bullets: ["Primary business key appears to be customer_id.", "The records are mostly complete for active customers.", "Lifecycle fields can support retention and churn analysis."],
      actions: ["Copy", "Save to Dataset"],
    },
    {
      id: "msg-2",
      role: "user",
      body: "Find quality issues and explain them in business language.",
    },
    {
      id: "msg-3",
      role: "assistant",
      kind: "quality",
      title: "Quality assessment",
      body: "The dataset is ready for analysis, with a few fields that should be improved before executive reporting.",
      bullets: ["Email is missing in 4.8% of rows, reducing contactability analysis coverage.", "State values use three naming patterns and should be standardized.", "Last purchase date is older than expected for 312 active customers."],
      actions: ["Save", "Open suggestion"],
    },
    {
      id: "msg-4",
      role: "assistant",
      kind: "glossary",
      title: "Business glossary draft",
      body: "Suggested definitions that can be saved back to the dataset metadata.",
      glossary: [
        { term: "customer_id", definition: "Unique customer identifier used across commercial systems.", dataType: "Text", example: "C-10429" },
        { term: "lifecycle_stage", definition: "Current relationship stage for the customer account.", dataType: "Category", example: "Active" },
        { term: "account_owner", definition: "Person responsible for the customer relationship.", dataType: "Text", example: "Marina Costa" },
      ],
      actions: ["Save to Catalog", "Copy"],
    },
  ],
  relationships: [
    { dataset: "Orders", confidence: 94, key: "customer_id" },
    { dataset: "Support Tickets", confidence: 82, key: "customer_id" },
    { dataset: "Payments", confidence: 73, key: "billing_account_id" },
  ],
  suggestedOutputs: [
    { name: "Customer 360", description: "Unified account profile with engagement, revenue and support context." },
    { name: "Commercial Analytics", description: "Reusable view for sales performance and territory reviews." },
    { name: "CRM Gold Layer", description: "Governed customer table for operational reports." },
  ],
};
