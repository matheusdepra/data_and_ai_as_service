import { Database } from "lucide-react";

import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";

type DatasetNodeProps = {
  name: string;
  rows: string | number;
  columns: string | number;
  confidence: string | number;
};

export function DatasetNode({ name, rows, columns, confidence }: DatasetNodeProps) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3F1FF] text-[#6E5BFF]">
              <Database aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#111827]">{name}</p>
              <Badge variant="secondary">Dataset</Badge>
            </div>
          </div>
          <Badge variant="success">Trusted</Badge>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-[#9CA3AF]">Rows</dt>
            <dd className="mt-1 font-semibold text-[#111827]">{rows}</dd>
          </div>
          <div>
            <dt className="text-[#9CA3AF]">Columns</dt>
            <dd className="mt-1 font-semibold text-[#111827]">{columns}</dd>
          </div>
          <div>
            <dt className="text-[#9CA3AF]">Confidence</dt>
            <dd className="mt-1 font-semibold text-[#111827]">{confidence}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
