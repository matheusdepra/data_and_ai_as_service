import { ArrowRight, CheckCircle2, ExternalLink, X } from "lucide-react";
import type { HomeSuggestion, SuggestionAction } from "../types";

const actionLabels: Record<SuggestionAction, string> = {
  review: "Review",
  open: "Open",
  dismiss: "Dismiss",
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
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan-700">{suggestion.title}</p>
          <h3 className="mt-2 text-base font-semibold text-slate-950">{suggestion.primaryLabel}</h3>
          {suggestion.secondaryLabel ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
              <ArrowRight aria-hidden="true" className="h-4 w-4 text-slate-400" />
              <span>{suggestion.secondaryLabel}</span>
            </div>
          ) : null}
        </div>
        {typeof suggestion.confidence === "number" ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            {suggestion.confidence}% confidence
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{suggestion.detail}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {suggestion.actions.map((action) => (
          <button
            key={action}
            type="button"
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
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
