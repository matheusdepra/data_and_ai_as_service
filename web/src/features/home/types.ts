export type HomeActionKind = "upload" | "workspace" | "catalog";

export type HomeAction = {
  kind: HomeActionKind;
  title: string;
  description: string;
  href: string;
};

export type ContinueWorkspace = {
  id: string;
  name: string;
  description: string;
  lastUpdated: string;
  href: string;
};

export type ActivityEvent = {
  id: string;
  title: string;
  subject: string;
  happenedAt: string;
};

export type SuggestionAction = "review" | "open" | "dismiss";

export type HomeSuggestion = {
  id: string;
  type: "relationship" | "workspace" | "asset";
  title: string;
  primaryLabel: string;
  secondaryLabel?: string;
  detail: string;
  confidence?: number;
  actions: SuggestionAction[];
};

export type HomeData = {
  actions: HomeAction[];
  continueWorking: ContinueWorkspace[];
  recentActivity: ActivityEvent[];
  suggestions: HomeSuggestion[];
};
