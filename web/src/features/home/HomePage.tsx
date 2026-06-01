import { useMemo, useState } from "react";
import { ActionCard } from "./components/ActionCard";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { HomeEmptyState } from "./components/HomeEmptyState";
import { SuggestionCard } from "./components/SuggestionCard";
import { LoadingState } from "@/components/shared/LoadingState";
import { useHomeData } from "./hooks/use-home-data";
import { isHomeEmpty } from "./services/home-service";
import type { SuggestionAction } from "./types";

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

  if (isLoading) return <LoadingState label="Loading home" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div>
      <div className="grid gap-8">
        {data && isHomeEmpty(data) ? <HomeEmptyState /> : null}
        {data && !isHomeEmpty(data) ? (
          <>
            <section>
              <div className="max-w-3xl">
                <h1 className="text-4xl font-semibold leading-tight text-[#101828]">Welcome back, Matheus.</h1>
                <p className="mt-3 text-base leading-7 text-[#667085]">What would you like to do today?</p>
              </div>
              <div className="mt-7 grid gap-4 lg:grid-cols-3">
                {data.actions.map((action) => (
                  <ActionCard key={action.kind} action={action} />
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-base font-semibold text-[#101828]">Recent Projects</h2>
                  <a className="text-sm font-medium text-[#6E5BFF] hover:text-[#5F4CF0]" href="/workspaces">
                    View all
                  </a>
                </div>
                <div className="mt-4 divide-y divide-[#EAECF0]">
                  {data.continueWorking.map((workspace) => (
                    <a
                      key={workspace.id}
                      href={workspace.href}
                      className="group flex items-center justify-between gap-4 py-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F1FF] text-sm font-semibold text-[#6E5BFF]">
                          {workspace.name
                            .split(" ")
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#101828]">{workspace.name}</p>
                          <p className="mt-1 truncate text-sm text-[#667085]">{workspace.description}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <span className="hidden text-xs font-medium text-[#98A2B3] sm:inline">{workspace.lastUpdated}</span>
                        <span className="text-[#98A2B3] transition group-hover:text-[#667085]">…</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-base font-semibold text-[#101828]">Recent Activity</h2>
                  <a className="text-sm font-medium text-[#6E5BFF] hover:text-[#5F4CF0]" href="/ingestions">
                    View all
                  </a>
                </div>
                <div className="mt-4">
                  <ActivityTimeline items={data.recentActivity} />
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-base font-semibold text-[#101828]">AI Suggestions</h2>
                <a className="text-sm font-medium text-[#6E5BFF] hover:text-[#5F4CF0]" href="/home">
                  View all
                </a>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {suggestions.length > 0 ? (
                  suggestions.slice(0, 2).map((suggestion) => (
                    <SuggestionCard key={suggestion.id} suggestion={suggestion} onAction={handleSuggestionAction} />
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-[#D0D5DD] bg-[#FAFBFC] p-5 text-sm text-[#667085]">
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
