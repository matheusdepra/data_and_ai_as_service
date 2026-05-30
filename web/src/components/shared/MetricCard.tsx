import { TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "../../lib/utils";
import { Card, CardContent } from "../ui/card";

type MetricCardProps = {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  comparison?: string;
  className?: string;
};

export function MetricCard({ label, value, trend = "neutral", comparison, className }: MetricCardProps) {
  const isUp = trend === "up";
  const isDown = trend === "down";

  return (
    <Card className={className}>
      <CardContent className="p-5">
        <p className="text-sm font-medium text-[#6B7280]">{label}</p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <p className="text-3xl font-bold leading-[1.3] text-[#111827]">{value}</p>
          {trend !== "neutral" ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
                isUp && "bg-[#F0FDF4] text-green-700",
                isDown && "bg-[#FEF2F2] text-red-700",
              )}
            >
              {isUp ? <TrendingUp aria-hidden="true" className="h-3.5 w-3.5" /> : <TrendingDown aria-hidden="true" className="h-3.5 w-3.5" />}
              {comparison}
            </span>
          ) : null}
        </div>
        {trend === "neutral" && comparison ? <p className="mt-3 text-xs text-[#9CA3AF]">{comparison}</p> : null}
      </CardContent>
    </Card>
  );
}
