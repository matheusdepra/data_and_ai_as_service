import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

type ErrorStateProps = {
  message: string;
  reason?: string;
  retryLabel?: string;
  onRetry?: () => void;
};

export function ErrorState({ message, reason, retryLabel = "Retry", onRetry }: ErrorStateProps) {
  return (
    <Card className="border-[#FECACA] bg-[#FEF2F2]">
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-600">
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-[#111827]">{message}</h3>
            {reason ? <p className="mt-1 text-sm leading-normal text-[#6B7280]">{reason}</p> : null}
          </div>
        </div>
        {onRetry ? (
          <div>
            <Button variant="secondary" onClick={onRetry}>
              <RefreshCw aria-hidden="true" />
              {retryLabel}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
