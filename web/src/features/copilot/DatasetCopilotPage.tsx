import { Link, useParams } from "react-router-dom";
import { ArrowRight, BookOpen, Copy, Download, Link2, MessageSquarePlus, Save, Share2, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { MetricCard } from "@/components/shared/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { useDatasetCopilot } from "./hooks/use-dataset-copilot";
import type { DatasetCopilotMessage } from "./types";

export function DatasetCopilotPage() {
  const { ingestionId } = useParams();
  const { data, isLoading, isError, refetch } = useDatasetCopilot(ingestionId);

  if (isLoading) return <LoadingState rows={4} />;
  if (isError || !data) {
    return <ErrorState message="Could not load dataset copilot" reason="The mocked copilot context is unavailable." retryLabel="Try again" onRetry={() => void refetch()} />;
  }

  const { summary } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${summary.datasetName} Copilot`}
        description="Chat with this dataset to understand meaning, quality, relationships and metadata improvements before moving to Workspace."
        actions={
          <>
            <Button variant="secondary" type="button">
              <Share2 aria-hidden="true" />
              Share
            </Button>
            <Button variant="outline" type="button">
              <Download aria-hidden="true" />
              Export Chat
            </Button>
            <Button asChild>
              <Link to="/workspaces/customer-analytics">
                Open Workspace
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-6">
          <section className="grid gap-4 md:grid-cols-4" aria-label="Dataset metrics">
            <MetricCard label="Rows" value={summary.rows} comparison="Ready for analysis" />
            <MetricCard label="Columns" value={summary.columns} comparison="Business + technical fields" />
            <MetricCard label="Quality" value={`${summary.qualityScore}%`} trend="up" comparison="High confidence" />
            <MetricCard label="Size" value={summary.size} comparison={summary.lastUpdated} />
          </section>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>Quick actions</CardTitle>
                  <CardDescription>Start with guided prompts instead of writing the perfect question.</CardDescription>
                </div>
                <Badge variant="info">Dataset-scoped</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {data.quickActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-left text-sm font-semibold text-[#111827] transition hover:border-[#6E5BFF]/40 hover:bg-[#F3F1FF]"
                  >
                    <span>{action}</span>
                    <MessageSquarePlus aria-hidden="true" className="h-4 w-4 shrink-0 text-[#6E5BFF]" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
              <CardDescription>Assistant responses can include explanations, quality assessment, glossary tables and relationship analysis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.messages.length === 0 ? (
                <EmptyState title="Ask your first question about this dataset" description="Try asking what the dataset is about, which columns matter or what quality issues exist." />
              ) : (
                data.messages.map((message) => <ConversationMessage key={message.id} message={message} />)
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ask anything about this dataset</CardTitle>
              <CardDescription>The copilot remains scoped to this dataset. Multi-dataset asset creation opens a Workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block">
                <span className="sr-only">Ask anything about this dataset</span>
                <Textarea placeholder="Ask anything about this dataset..." className="min-h-28" />
              </label>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {data.suggestedPrompts.map((prompt) => (
                    <Button key={prompt} variant="secondary" size="sm" type="button">
                      {prompt}
                    </Button>
                  ))}
                </div>
                <Button type="button">
                  Send question
                  <Sparkles aria-hidden="true" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Context Panel</CardTitle>
              <CardDescription>Current dataset awareness for every answer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-[#111827]">{summary.datasetName}</p>
                <p className="mt-1 text-sm leading-relaxed text-[#6B7280]">{summary.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">{summary.status}</Badge>
                <Badge variant="secondary">{summary.domain}</Badge>
                {summary.tags.map((tag) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
              <InfoLine label="Rows" value={summary.rows} />
              <InfoLine label="Columns" value={String(summary.columns)} />
              <InfoLine label="Quality score" value={`${summary.qualityScore}%`} />
              <InfoLine label="Last updated" value={summary.lastUpdated} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Relationships</CardTitle>
                  <CardDescription>Detected related datasets.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" type="button">View All</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.relationships.map((relationship) => (
                <div key={relationship.dataset} className="rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#111827]">{relationship.dataset}</p>
                    <Badge variant={relationship.confidence >= 80 ? "success" : "warning"}>{relationship.confidence}%</Badge>
                  </div>
                  <p className="mt-2 text-xs text-[#6B7280]">Relationship key: {relationship.key}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Suggested outputs</CardTitle>
              <CardDescription>Inspiration only. Creation happens in Workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.suggestedOutputs.map((output) => (
                <div key={output.name} className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3F1FF] text-[#6E5BFF]">
                      <BookOpen aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{output.name}</p>
                      <p className="mt-1 text-sm text-[#6B7280]">{output.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function ConversationMessage({ message }: { message: DatasetCopilotMessage }) {
  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-2xl rounded-2xl bg-[#6E5BFF] px-5 py-4 text-white">
        <p className="text-sm leading-relaxed">{message.body}</p>
      </div>
    );
  }

  return (
    <article className="max-w-4xl rounded-2xl border border-[#E5E7EB] bg-[#FAFBFC] p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3F1FF] text-[#6E5BFF]">
          <Sparkles aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-4">
          {message.title ? <h3 className="text-base font-semibold text-[#111827]">{message.title}</h3> : null}
          <p className="text-sm leading-relaxed text-[#6B7280]">{message.body}</p>
          {message.bullets?.length ? (
            <ul className="space-y-2 text-sm text-[#111827]">
              {message.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6E5BFF]" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {message.glossary?.length ? (
            <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F4F6F8] text-xs uppercase tracking-wide text-[#6B7280]">
                  <tr>
                    <th className="px-4 py-3">Term</th>
                    <th className="px-4 py-3">Definition</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Example</th>
                  </tr>
                </thead>
                <tbody>
                  {message.glossary.map((term) => (
                    <tr key={term.term} className="border-t border-[#E5E7EB]">
                      <td className="px-4 py-3 font-medium text-[#111827]">{term.term}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{term.definition}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{term.dataType}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{term.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 border-t border-[#E5E7EB] pt-4">
            <Button variant="ghost" size="sm" type="button"><ThumbsUp aria-hidden="true" />Like</Button>
            <Button variant="ghost" size="sm" type="button"><ThumbsDown aria-hidden="true" />Dislike</Button>
            <Button variant="ghost" size="sm" type="button"><Copy aria-hidden="true" />Copy</Button>
            {message.actions?.map((action) => (
              <Button key={action} variant="secondary" size="sm" type="button">
                {action.includes("Save") ? <Save aria-hidden="true" /> : <Link2 aria-hidden="true" />}
                {action}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-[#E5E7EB] pt-3 text-sm">
      <span className="text-[#6B7280]">{label}</span>
      <span className="font-medium text-[#111827]">{value}</span>
    </div>
  );
}
