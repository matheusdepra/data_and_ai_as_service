import { ArrowRight, CheckCircle2, ExternalLink, X } from "lucide-react";
import type { HomeSuggestion, SuggestionAction } from "../types";

const actionLabels: Record<SuggestionAction, string> = {
  review: "Review",
  open: "Open",
  dismiss: "Dismiss",
};

const actionVariants: Record<SuggestionAction, string> = {
  review:
    "border-transparent bg-[#6E5BFF] text-white hover:bg-[#5F4CF0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E5BFF]",
  open:
    "border-[#E5E7EB] bg-white text-[#344054] hover:border-[#D0D5DD] hover:text-[#101828] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E5BFF]",
  dismiss:
    "border-[#E5E7EB] bg-white text-[#667085] hover:border-[#D0D5DD] hover:text-[#101828] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E5BFF]",
};

type SuggestionCardProps = {
  suggestion: HomeSuggestion;
  onAction: (suggestionId: string, action: SuggestionAction) => void;
};

function ActionIcon({ action }: { action: SuggestionAction }) {
  if (action === "review") {
    return <CheckCircle2 aria-hidden="true" className="h-4 w-4" />;
  }

  if (action === "open") {
    return <ExternalLink aria-hidden="true" className="h-4 w-4" />;
  }

  return <X aria-hidden="true" className="h-4 w-4" />;
}

export function SuggestionCard({ suggestion, onAction }: SuggestionCardProps) {
  return (
    <article className="rounded-lg border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-[#667085]">{suggestion.title}</p>
          <h3 className="mt-2 text-base font-semibold text-[#101828]">{suggestion.primaryLabel}</h3>
          {suggestion.secondaryLabel ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-[#344054]">
              <ArrowRight aria-hidden="true" className="h-4 w-4 text-[#98A2B3]" />
              <span>{suggestion.secondaryLabel}</span>
            </div>
          ) : null}
        </div>
        {typeof suggestion.confidence === "number" ? (
          <span className="rounded-full border border-[#D1FADF] bg-[#ECFDF3] px-2.5 py-1 text-xs font-medium text-[#027A48]">
            {suggestion.confidence}% confidence
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-sm leading-6 text-[#667085]">{suggestion.detail}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {suggestion.actions.map((action) => (
          <button
            key={action}
            type="button"
            className={[
              "inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition",
              actionVariants[action],
            ].join(" ")}
            onClick={() => onAction(suggestion.id, action)}
          >
            <ActionIcon action={action} />
            {actionLabels[action]}
          </button>
        ))}
      </div>
    </article>
  );
}
