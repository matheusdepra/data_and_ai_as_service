import { Download } from "lucide-react";

import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

type ChartCardProps = {
  title: string;
  description?: string;
  onExport?: () => void;
  children: React.ReactNode;
};

export function ChartCard({ title, description, onExport, children }: ChartCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
          {description ? <p className="mt-1 text-sm text-[#6B7280]">{description}</p> : null}
        </div>
        {onExport ? (
          <Button variant="secondary" size="sm" onClick={onExport}>
            <Download aria-hidden="true" />
            Export
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
