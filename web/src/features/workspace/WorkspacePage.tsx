import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, Clock, GitBranch, History, MessageSquarePlus, Plus, Save, Share2, Sparkles, Table2 } from "lucide-react";

import { DataTable } from "@/components/data/DataTable";
import { DatasetNode } from "@/components/workspace/DatasetNode";
import { OutputNode } from "@/components/workspace/OutputNode";
import { RelationshipEdge } from "@/components/workspace/RelationshipEdge";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { useWorkspaceData } from "./hooks/use-workspace-data";
import type { WorkspaceData, WorkspaceMessage, WorkspaceOutput } from "./types";

type WorkspaceView = "chat" | "canvas" | "preview" | "lineage";

export function WorkspacePage() {
  const { workspaceId } = useParams();
  const { data, isLoading, isError, refetch } = useWorkspaceData(workspaceId);
  const [view, setView] = useState<WorkspaceView>("chat");

  const previewColumns = useMemo<ColumnDef<Record<string, string | number>>[]>(() => {
    if (!data?.previewRows[0]) return [];
    return Object.keys(data.previewRows[0]).map((key) => ({ accessorKey: key, header: humanize(key) }));
  }, [data?.previewRows]);

  if (isLoading) return <LoadingState rows={4} />;
  if (isError || !data) {
    return <ErrorState message="Could not load workspace" reason="The mocked workspace state is unavailable." retryLabel="Try again" onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.name}
        description={data.description}
        actions={
          <>
            <Button variant="secondary" type="button"><Share2 aria-hidden="true" />Share</Button>
            <Button variant="outline" type="button"><Save aria-hidden="true" />Save Draft</Button>
            <Button type="button"><Plus aria-hidden="true" />New</Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-dv-card lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{data.metadata}</Badge>
          <Badge variant="info">Approval required before asset creation</Badge>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Workspace views">
          {(["chat", "canvas", "preview", "lineage"] as WorkspaceView[]).map((nextView) => (
            <Button key={nextView} variant={view === nextView ? "default" : "secondary"} size="sm" type="button" onClick={() => setView(nextView)}>
              {humanize(nextView)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-6">
          {view === "chat" ? <WorkspaceChat messages={data.messages} suggestedPrompts={data.suggestedPrompts} /> : null}
          {view === "canvas" ? <WorkspaceCanvas data={data} /> : null}
          {view === "preview" ? (
            <DataTable title="Output preview" description="First rows and expected business columns for the proposed output." columns={previewColumns} data={data.previewRows} searchPlaceholder="Search preview" />
          ) : null}
          {view === "lineage" ? <LineageView outputs={data.outputs} /> : null}
        </main>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available datasets</CardTitle>
              <CardDescription>Workspace context available to the assistant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.datasets.map((dataset) => (
                <div key={dataset.id} className="rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{dataset.name}</p>
                      <p className="mt-1 text-xs text-[#6B7280]">{dataset.rows} rows · {dataset.columns} columns</p>
                    </div>
                    <Badge variant={dataset.status === "Ready" ? "success" : "warning"}>{dataset.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-[#6B7280]">{dataset.description}</p>
                </div>
              ))}
              <Button variant="secondary" className="w-full" type="button"><Plus aria-hidden="true" />Add Dataset</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated assets</CardTitle>
              <CardDescription>Drafts created or proposed inside this workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.outputs.map((output) => (
                <OutputSummary key={output.id} output={output} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Suggested ideas</CardTitle>
              <CardDescription>Use an idea to seed the conversation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.ideas.map((idea) => (
                <div key={idea.name} className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                  <p className="text-sm font-semibold text-[#111827]">{idea.name}</p>
                  <p className="mt-1 text-sm text-[#6B7280]">{idea.description}</p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" size="sm" type="button">Use Idea</Button>
                    <Button variant="ghost" size="sm" type="button">Dismiss</Button>
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

function WorkspaceChat({ messages, suggestedPrompts }: { messages: WorkspaceMessage[]; suggestedPrompts: string[] }) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
          <CardDescription>Describe what you want to build. Dativerso explains reasoning, previews output and asks for approval.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages.map((message) => (
            <article key={message.id} className={message.role === "user" ? "ml-auto max-w-2xl rounded-2xl bg-[#6E5BFF] px-5 py-4 text-white" : "max-w-4xl rounded-2xl border border-[#E5E7EB] bg-[#FAFBFC] p-5"}>
              {message.role === "assistant" ? (
                <div className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3F1FF] text-[#6E5BFF]"><Sparkles aria-hidden="true" className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1 space-y-4">
                    {message.title ? <h3 className="text-base font-semibold text-[#111827]">{message.title}</h3> : null}
                    <p className="text-sm leading-relaxed text-[#6B7280]">{message.body}</p>
                    {message.details?.length ? (
                      <dl className="grid gap-3 md:grid-cols-3">
                        {message.details.map((detail) => (
                          <div key={detail.label} className="rounded-xl border border-[#E5E7EB] bg-white p-3">
                            <dt className="text-xs text-[#9CA3AF]">{detail.label}</dt>
                            <dd className="mt-1 text-sm font-semibold text-[#111827]">{detail.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {message.actions?.map((action) => <Button key={action} variant="secondary" size="sm" type="button">{action}</Button>)}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-relaxed">{message.body}</p>
              )}
            </article>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace input</CardTitle>
          <CardDescription>Every asset follows: understand request, find datasets, explain reasoning, preview, request approval and then create.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block">
            <span className="sr-only">Describe what you want to build</span>
            <Textarea placeholder="Describe what you want to build..." className="min-h-28" />
          </label>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt) => <Button key={prompt} variant="secondary" size="sm" type="button"><MessageSquarePlus aria-hidden="true" />{prompt}</Button>)}
            </div>
            <Button type="button">Ask Workspace <ArrowRight aria-hidden="true" /></Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function WorkspaceCanvas({ data }: { data: WorkspaceData }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Canvas visualization</CardTitle>
              <CardDescription>Visual explanation of datasets, selected relationships and proposed outputs. The canvas explains, it does not configure pipelines.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" type="button">Fit to Screen</Button>
              <Button variant="secondary" size="sm" type="button">Show Confidence</Button>
              <Button variant="secondary" size="sm" type="button">Show Metrics</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 xl:grid-cols-[1fr_280px_1fr]">
            <div className="space-y-4">
              {data.datasets.map((dataset) => (
                <DatasetNode key={dataset.id} name={dataset.name} rows={dataset.rows} columns={dataset.columns} confidence={`${dataset.confidence}%`} />
              ))}
            </div>
            <div className="flex flex-col justify-center gap-4">
              {data.relationships.map((relationship) => (
                <RelationshipEdge key={relationship.id} relationshipKey={relationship.key} confidence={`${relationship.confidence}%`} type={relationship.type} />
              ))}
            </div>
            <div className="space-y-4">
              {data.outputs.map((output) => (
                <OutputNode key={output.id} name={output.name} status={output.status === "Generating" ? "processing" : output.status === "Published" ? "published" : output.status === "Ready" ? "ready" : "draft"} confidence={`${output.confidence}%`} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Output preview</CardTitle>
          <CardDescription>Before generation, Dativerso explains why datasets were selected, relationships used and expected business value.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {data.outputs.map((output) => <OutputSummary key={output.id} output={output} />)}
        </CardContent>
      </Card>
    </div>
  );
}

function LineageView({ outputs }: { outputs: WorkspaceOutput[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lineage</CardTitle>
        <CardDescription>Business-friendly lineage for proposed assets. Technical cloud resources remain hidden by default.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {outputs.map((output) => (
          <div key={output.id} className="rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#111827]">{output.name}</p>
                <p className="mt-1 text-sm text-[#6B7280]">{output.businessValue}</p>
              </div>
              <Badge variant="secondary">{output.status}</Badge>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[#6B7280]">
              {output.sources.map((source, index) => (
                <span key={source} className="inline-flex items-center gap-2">
                  <Badge variant="outline">{source}</Badge>
                  {index < output.sources.length - 1 ? <GitBranch aria-hidden="true" className="h-4 w-4 text-[#9CA3AF]" /> : null}
                </span>
              ))}
              <ArrowRight aria-hidden="true" className="h-4 w-4 text-[#9CA3AF]" />
              <Badge variant="info">{output.name}</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function OutputSummary({ output }: { output: WorkspaceOutput }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#111827]">{output.name}</p>
          <p className="mt-1 text-sm text-[#6B7280]">{output.businessValue}</p>
        </div>
        <Badge variant={output.status === "Published" || output.status === "Ready" ? "success" : output.status === "Generating" ? "info" : "secondary"}>{output.status}</Badge>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div><dt className="text-[#9CA3AF]">Confidence</dt><dd className="mt-1 font-semibold text-[#111827]">{output.confidence}%</dd></div>
        <div><dt className="text-[#9CA3AF]">Rows</dt><dd className="mt-1 font-semibold text-[#111827]">{output.expectedRows}</dd></div>
        <div><dt className="text-[#9CA3AF]">Columns</dt><dd className="mt-1 font-semibold text-[#111827]">{output.expectedColumns}</dd></div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" type="button"><Table2 aria-hidden="true" />Preview</Button>
        <Button variant="ghost" size="sm" type="button"><Clock aria-hidden="true" />History</Button>
      </div>
    </div>
  );
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
