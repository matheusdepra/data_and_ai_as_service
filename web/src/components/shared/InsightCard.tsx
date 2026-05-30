import { Sparkles } from "lucide-react";

import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";

type InsightCardProps = {
  title: string;
  summary: string;
  impact?: "low" | "medium" | "high";
  confidence?: number | string;
};

const impactLabel = {
  low: "Low Impact",
  medium: "Medium Impact",
  high: "High Impact",
};

export function InsightCard({ title, summary, impact = "medium", confidence }: InsightCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3F1FF] text-[#6E5BFF]">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold leading-[1.3] text-[#111827]">{title}</h3>
              <Badge variant={impact === "high" ? "warning" : "secondary"}>{impactLabel[impact]}</Badge>
            </div>
            <p className="mt-2 text-sm leading-normal text-[#6B7280]">{summary}</p>
            {confidence ? <p className="mt-4 text-xs font-medium text-[#9CA3AF]">Confidence: {confidence}</p> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
