import type { HomeData } from "../types";

export const homeMock: HomeData = {
  actions: [
    {
      kind: "upload",
      title: "Upload Dataset",
      description: "Import CSV, Excel, JSON or Parquet files.",
      href: "/upload",
    },
    {
      kind: "workspace",
      title: "Create Workspace",
      description: "Start a new AI-guided workspace.",
      href: "/workspaces/new",
    },
    {
      kind: "catalog",
      title: "Explore Catalog",
      description: "Browse datasets, assets and dashboards.",
      href: "/catalog",
    },
  ],
  continueWorking: [
    {
      id: "customer-analytics",
      name: "Customer Analytics",
      description: "Cross customer, orders and payments data.",
      lastUpdated: "Updated 2 hours ago",
      href: "/workspaces/customer-analytics",
    },
    {
      id: "fleet-monitoring",
      name: "Fleet Monitoring",
      description: "Monitor vehicle operational metrics.",
      lastUpdated: "Updated yesterday",
      href: "/workspaces/fleet-monitoring",
    },
    {
      id: "sales-forecast",
      name: "Sales Forecast",
      description: "Prepare demand signals for the regional sales plan.",
      lastUpdated: "Updated 3 days ago",
      href: "/workspaces/sales-forecast",
    },
  ],
  recentActivity: [
    {
      id: "dataset-uploaded",
      title: "Dataset uploaded",
      subject: "customers.csv",
      happenedAt: "10 minutes ago",
    },
    {
      id: "workspace-created",
      title: "Workspace created",
      subject: "Customer Analytics",
      happenedAt: "1 hour ago",
    },
    {
      id: "dashboard-generated",
      title: "Dashboard generated",
      subject: "Sales Overview",
      happenedAt: "Yesterday",
    },
  ],
  suggestions: [
    {
      id: "customer-orders-relationship",
      type: "relationship",
      title: "Potential relationship found",
      primaryLabel: "Customer Dataset",
      secondaryLabel: "Orders Dataset",
      detail: "Dativerso found matching customer identifiers across both datasets.",
      confidence: 94,
      actions: ["review", "open", "dismiss"],
    },
    {
      id: "customer-workspace",
      type: "workspace",
      title: "Suggested workspace",
      primaryLabel: "Customer Analytics",
      detail: "Based on recently uploaded datasets.",
      actions: ["review", "open", "dismiss"],
    },
    {
      id: "customer-360-asset",
      type: "asset",
      title: "Potential asset",
      primaryLabel: "Customer 360",
      detail: "Estimated confidence: 89%",
      confidence: 89,
      actions: ["review", "open", "dismiss"],
    },
  ],
};

export const emptyHomeMock: HomeData = {
  ...homeMock,
  continueWorking: [],
  recentActivity: [],
  suggestions: [],
};
