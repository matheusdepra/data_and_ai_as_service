import { FileX2 } from "lucide-react";

import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-4 p-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F4F6F8] text-[#6B7280]">
          <FileX2 aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="max-w-xl">
          <h3 className="text-lg font-semibold leading-[1.3] text-[#111827]">{title}</h3>
          <p className="mt-2 text-sm leading-normal text-[#6B7280]">{description}</p>
        </div>
        {actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
      </CardContent>
    </Card>
  );
}
