import { useMemo, useState } from "react";
import { ActionCard } from "./components/ActionCard";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { HomeEmptyState } from "./components/HomeEmptyState";
import { SuggestionCard } from "./components/SuggestionCard";
import { useHomeData } from "./hooks/use-home-data";
import { isHomeEmpty } from "./services/home-service";
import type { SuggestionAction } from "./types";

function LoadingState() {
  return (
    <div className="space-y-4" aria-label="Loading Home">
      <div className="h-36 animate-pulse rounded-lg bg-slate-100" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-44 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-44 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-44 animate-pulse rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="rounded-lg border border-red-200 bg-red-50 p-6">
      <h2 className="text-base font-semibold text-red-950">Home could not be loaded</h2>
      <p className="mt-2 text-sm text-red-700">Try again to reload your launchpad.</p>
      <button
        type="button"
        className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:border-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
        onClick={onRetry}
      >
        Retry
      </button>
    </section>
  );
}

function HomePageContent() {
  const { data, isError, isLoading, refetch } = useHomeData();
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);

  const suggestions = useMemo(
    () => data?.suggestions.filter((suggestion) => !dismissedSuggestions.includes(suggestion.id)) ?? [],
    [data?.suggestions, dismissedSuggestions],
  );

  function handleSuggestionAction(suggestionId: string, action: SuggestionAction) {
    if (action === "dismiss") {
      setDismissedSuggestions((current) => [...current, suggestionId]);
    }
  }

  return (
    <div>
      <div className="grid gap-8">
        {isLoading ? <LoadingState /> : null}
        {isError ? <ErrorState onRetry={() => void refetch()} /> : null}
        {data && isHomeEmpty(data) ? <HomeEmptyState /> : null}
        {data && !isHomeEmpty(data) ? (
          <>
            <section className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
              <div className="max-w-3xl">
                <h1 className="text-4xl font-semibold leading-tight text-slate-950">
                  What would you like to build today?
                </h1>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  Build datasets, analytics assets and dashboards with AI assistance.
                </p>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {data.actions.map((action) => (
                  <ActionCard key={action.kind} action={action} />
                ))}
              </div>
            </section>

            <section className="grid gap-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-950">Continue Working</h2>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {data.continueWorking.map((workspace) => (
                  <article key={workspace.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-slate-950">{workspace.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{workspace.description}</p>
                    <p className="mt-4 text-xs font-medium text-slate-500">{workspace.lastUpdated}</p>
                    <a
                      href={workspace.href}
                      className="mt-5 inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-cyan-700 transition hover:border-cyan-300"
                    >
                      Open Workspace
                    </a>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-950">Recent Activity</h2>
                <div className="mt-6">
                  <ActivityTimeline items={data.recentActivity} />
                </div>
              </div>

              <div className="grid gap-4">
                <h2 className="text-xl font-semibold text-slate-950">Suggested Next Steps</h2>
                {suggestions.length > 0 ? (
                  suggestions.map((suggestion) => (
                    <SuggestionCard key={suggestion.id} suggestion={suggestion} onAction={handleSuggestionAction} />
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
                    No suggestions pending review.
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function HomePage() {
  return <HomePageContent />;
}
