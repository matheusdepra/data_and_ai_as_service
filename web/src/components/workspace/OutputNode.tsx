import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";

type OutputNodeProps = {
  name: string;
  status: "ready" | "draft" | "processing" | "failed" | "needs-attention" | "published";
  confidence: string | number;
};

export function OutputNode({ name, status, confidence }: OutputNodeProps) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-[#111827]">{name}</p>
          <Badge variant={status === "failed" ? "destructive" : status === "processing" ? "info" : "secondary"}>{status}</Badge>
        </div>
        <p className="text-sm text-[#6B7280]">Confidence {confidence}</p>
      </CardContent>
    </Card>
  );
}
