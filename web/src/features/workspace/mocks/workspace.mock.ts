import type { WorkspaceData } from "../types";

export const workspaceMock: WorkspaceData = {
  name: "Customer Analytics",
  description: "Understand customer behavior by unifying customer, order and support data into reusable business assets.",
  metadata: "Workspace · Created today · Draft",
  datasets: [
    { id: "customers", name: "Customer Master", rows: "12,340", columns: 42, confidence: 94, primaryKey: "customer_id", status: "Ready", description: "Current customer profile and lifecycle attributes." },
    { id: "orders", name: "Orders", rows: "84,210", columns: 31, confidence: 91, primaryKey: "order_id", status: "Ready", description: "Commercial transactions with revenue and status." },
    { id: "support", name: "Support Tickets", rows: "18,902", columns: 26, confidence: 82, primaryKey: "ticket_id", status: "Suggested", description: "Support activity and satisfaction signals." },
  ],
  relationships: [
    { id: "rel-1", source: "Customer Master", target: "Orders", key: "customer_id", confidence: 94, type: "Approved", reasoning: "Both datasets share customer_id with high uniqueness and matching value distribution." },
    { id: "rel-2", source: "Customer Master", target: "Support Tickets", key: "customer_id", confidence: 82, type: "Suggested", reasoning: "Support tickets can enrich account health and service risk metrics." },
  ],
  outputs: [
    { id: "out-1", name: "Customer Order Analytics", status: "Draft", confidence: 91, sources: ["Customer Master", "Orders"], expectedColumns: 28, expectedRows: "12,340", businessValue: "Provides customer revenue, purchase frequency and lifecycle context." },
    { id: "out-2", name: "Customer 360", status: "Generating", confidence: 86, sources: ["Customer Master", "Orders", "Support Tickets"], expectedColumns: 36, expectedRows: "12,340", businessValue: "Combines account, revenue and service signals for retention workflows." },
  ],
  messages: [
    { id: "m-1", role: "user", body: "Cross customer data with orders and explain what we can build." },
    { id: "m-2", role: "assistant", title: "Possible relationship found", body: "Customer Master and Orders can be joined through customer_id with high confidence. I recommend first creating a Customer Order Analytics draft before adding support tickets.", details: [{ label: "Join confidence", value: "94%" }, { label: "Relationship key", value: "customer_id" }, { label: "Expected output", value: "Customer Order Analytics" }], actions: ["Show preview", "Save draft", "Modify"] },
    { id: "m-3", role: "assistant", title: "Potential output", body: "The draft would help business teams analyze revenue, frequency, last purchase date and lifecycle stage by customer. I will not create the asset until you approve it.", details: [{ label: "Sources", value: "Customer Master, Orders" }, { label: "Expected columns", value: "28" }, { label: "Status", value: "Draft" }], actions: ["Create Dataset", "Save Draft"] },
  ],
  ideas: [
    { name: "Customer 360", description: "Unify customer, order, support and payment context." },
    { name: "Sales Performance", description: "Track revenue, order frequency and account ownership." },
    { name: "Customer Segmentation", description: "Group customers by value, recency and engagement." },
    { name: "Churn Analysis", description: "Find accounts with declining activity and service risk." },
  ],
  suggestedPrompts: ["Cross customers with orders", "Create a customer 360", "Build a sales dashboard", "Find customer segments", "Generate a churn analysis", "Create a business glossary"],
  previewRows: [
    { customer: "Acme Retail", lifecycle: "Active", orders: 42, revenue: "$184,200", last_order: "May 24, 2026" },
    { customer: "Northstar Foods", lifecycle: "Expansion", orders: 31, revenue: "$132,800", last_order: "May 22, 2026" },
    { customer: "Bluebird Health", lifecycle: "At risk", orders: 12, revenue: "$48,900", last_order: "April 30, 2026" },
  ],
};
