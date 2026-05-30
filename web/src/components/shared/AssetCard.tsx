import { ArrowUpRight } from "lucide-react";

import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

type AssetCardProps = {
  name: string;
  type: string;
  description?: string;
  trustScore?: number | string;
  lastUpdated?: string;
  href?: string;
  actionLabel?: string;
  className?: string;
};

export function AssetCard({
  name,
  type,
  description,
  trustScore,
  lastUpdated,
  href,
  actionLabel = "Open",
  className,
}: AssetCardProps) {
  return (
    <Card className={cn("transition duration-200 hover:shadow-dv-elevated", className)}>
      <CardHeader className="gap-3 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge variant="secondary">{type}</Badge>
            <CardTitle className="mt-3 truncate">{name}</CardTitle>
          </div>
          {href ? (
            <Button asChild variant="secondary" size="sm">
              <a href={href}>
                {actionLabel}
                <ArrowUpRight aria-hidden="true" />
              </a>
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {description ? <p className="text-sm leading-normal text-[#6B7280]">{description}</p> : null}
        <dl className="mt-5 grid grid-cols-2 gap-4 text-xs text-[#6B7280]">
          <div>
            <dt className="font-medium text-[#9CA3AF]">Trust Score</dt>
            <dd className="mt-1 text-sm font-semibold text-[#111827]">{trustScore ?? "Not scored"}</dd>
          </div>
          <div>
            <dt className="font-medium text-[#9CA3AF]">Last Updated</dt>
            <dd className="mt-1 text-sm font-semibold text-[#111827]">{lastUpdated ?? "Unknown"}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
