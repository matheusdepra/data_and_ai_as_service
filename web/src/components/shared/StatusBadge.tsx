import { Badge } from "../ui/badge";

type Status = "ready" | "draft" | "processing" | "failed" | "needs-attention" | "published";

const statusConfig: Record<Status, { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  ready: { label: "Ready", variant: "success" },
  draft: { label: "Draft", variant: "outline" },
  processing: { label: "Processing", variant: "info" },
  failed: { label: "Failed", variant: "destructive" },
  "needs-attention": { label: "Needs Attention", variant: "warning" },
  published: { label: "Published", variant: "secondary" },
};

type StatusBadgeProps = {
  status: Status;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return <Badge variant={config.variant} className={className}>{config.label}</Badge>;
}

export type { Status };
