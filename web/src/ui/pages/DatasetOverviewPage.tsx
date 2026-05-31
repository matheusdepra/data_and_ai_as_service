import { useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Brain,
  Database,
  FileSpreadsheet,
  Link2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TableProperties,
} from "lucide-react";

import { DataPreviewTable } from "@/components/data/DataPreviewTable";
import { DataTable } from "@/components/data/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OverviewCopilotDrawer, OverviewCopilotRail } from "@/features/overview/components/OverviewCopilot";
import { overviewCopilotPrompts } from "@/features/overview/mocks/overview-copilot.mock";
import {
  buildOverviewCopilotContext,
  createOverviewCopilotWelcome,
  getOverviewCopilotReply,
} from "@/features/overview/services/overview-copilot-service";
import type { OverviewCopilotMessage } from "@/features/overview/types";

import {
  getIngestionDetail,
  getIngestionOverview,
  runIngestionOverview,
  type IngestionDetail,
  type IngestionOverviewResponse,
} from "../lib/api";
import { getJwt } from "../lib/storage";

export function DatasetOverviewPage() {
  const { ingestionId = "" } = useParams();
  const normalizedIngestionId = ingestionId.trim();
  const [detail, setDetail] = useState<IngestionDetail | null>(null);
  const [overview, setOverview] = useState<IngestionOverviewResponse | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotDraft, setCopilotDraft] = useState("");
  const [copilotThinking, setCopilotThinking] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState<OverviewCopilotMessage[]>([]);
  const requestedRun = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function load() {
      if (!normalizedIngestionId) return;
      setBusy(true);
      try {
        const jwt = getJwt();
        const [detailRes, overviewRes] = await Promise.allSettled([
          getIngestionDetail({ jwt, ingestionId: normalizedIngestionId }),
          getIngestionOverview({ jwt, ingestionId: normalizedIngestionId }),
        ]);

        const nextDetail = detailRes.status === "fulfilled" ? detailRes.value : null;
        const nextOverview = overviewRes.status === "fulfilled" ? overviewRes.value : null;

        if (!cancelled) {
          setDetail(nextDetail);
          setOverview(nextOverview);
          setErr(detailRes.status === "rejected" ? String(detailRes.reason) : "");
        }

        if (
          !requestedRun.current &&
          nextDetail?.ingestion.status === "silver_ready" &&
          (nextOverview === null || nextOverview.status === "pending")
        ) {
          requestedRun.current = true;
          try {
            await runIngestionOverview({ jwt, ingestionId: normalizedIngestionId });
          } catch {
            // Let polling surface the backend state/error.
          }
        }

        const shouldPoll =
          nextDetail?.ingestion.status === "silver_ready" &&
          (!nextOverview || nextOverview.status === "pending" || nextOverview.status === "running");
        if (!cancelled && shouldPoll) {
          timer = window.setTimeout(load, 2500);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [normalizedIngestionId]);

  const schemaColumns = useMemo<ColumnDef<SchemaRow>[]>(
    () => [
      { accessorKey: "normalized_name", header: "Column" },
      { accessorKey: "inferred_type", header: "Type" },
      {
        accessorKey: "cast_success_rate",
        header: "Cast",
        cell: ({ row }) => `${Math.round((row.original.cast_success_rate ?? 1) * 100)}%`,
      },
      {
        accessorKey: "warnings",
        header: "Warnings",
        cell: ({ row }) => row.original.warnings?.join(" • ") || "-",
      },
    ],
    [],
  );

  const previewColumns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    const first = overview?.overview?.preview_rows?.[0];
    if (!first) return [];
    return Object.keys(first).map((key) => ({
      accessorKey: key,
      header: humanize(key),
      cell: ({ row }) => stringifyValue(row.original[key]),
    }));
  }, [overview?.overview?.preview_rows]);

  if (!normalizedIngestionId) {
    return <ErrorState message="No ingestion selected" reason="Open this page from the Ingestions list or from Processing." />;
  }

  if (err && !detail) {
    return <ErrorState message="Could not load dataset overview" reason={err} retryLabel="Reload" onRetry={() => window.location.reload()} />;
  }

  const overviewStatus = overview?.status || detail?.ingestion.overview_status || "pending";
  const quality = overview?.overview?.quality;
  const schemaRows = (overview?.overview?.schema?.columns || []) as SchemaRow[];
  const previewRows = overview?.overview?.preview_rows || [];
  const relationships = overview?.overview?.relationships || [];
  const terms = overview?.overview?.terms || [];
  const overviewContext = useMemo(
    () =>
      buildOverviewCopilotContext({
        ingestionId: normalizedIngestionId,
        detail,
        overview,
        fallbackStatus: overviewStatus,
      }),
    [detail, normalizedIngestionId, overview, overviewStatus],
  );

  useEffect(() => {
    setCopilotMessages([createOverviewCopilotWelcome(overviewContext)]);
    setCopilotDraft("");
    setCopilotThinking(false);
    setCopilotOpen(false);
  }, [overviewContext.ingestionId, overviewContext.datasetName]);

  async function handleCopilotSubmit(question: string) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || copilotThinking) return;

    setCopilotOpen(true);
    setCopilotDraft("");
    setCopilotMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", body: cleanQuestion }]);
    setCopilotThinking(true);
    try {
      const reply = await getOverviewCopilotReply({ context: overviewContext, question: cleanQuestion });
      setCopilotMessages((prev) => [...prev, reply]);
    } finally {
      setCopilotThinking(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dataset Overview"
        description="Understanding comes before technical detail. Review what Dativerso learned, what quality it found and what can be built next."
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge variant={overviewStatus === "ready" ? "success" : overviewStatus === "failed" ? "warning" : "info"}>
              {overviewStatus === "ready" ? "Overview ready" : overviewStatus === "failed" ? "Needs retry" : "Preparing overview"}
            </Badge>
            <Button variant="secondary" type="button" onClick={() => setCopilotOpen(true)}>
              Dataset Copilot
              <Sparkles aria-hidden="true" />
            </Button>
            <Button variant="outline" type="button" onClick={() => window.location.reload()}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </Button>
            <Button variant="outline" asChild>
              <Link to="/ingestions">Back to Ingestions</Link>
            </Button>
          </div>
        }
      />

      <OverviewTabs />

      {busy && !overview ? <LoadingState rows={4} /> : null}

      {overviewStatus === "failed" ? (
        <ErrorState
          message="Overview analysis failed"
          reason={overview?.error?.message || detail?.ingestion.overview_error?.message || "The backend could not prepare the dataset overview."}
          retryLabel="Retry analysis"
          onRetry={async () => {
            const jwt = getJwt();
            await runIngestionOverview({ jwt, ingestionId: normalizedIngestionId });
            window.location.reload();
          }}
        />
      ) : null}

      {overviewStatus !== "failed" ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              <DatasetHeroCard
                datasetName={overviewContext.datasetName}
                classification={overviewContext.classification}
                tags={overviewContext.tags}
                statusLabel={overviewContext.statusLabel}
                updatedAt={overviewContext.updatedAt}
              />

              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <AiUnderstandingCard
                  summaryText={overviewContext.understanding}
                  confidence={overviewContext.confidence}
                  onOpenCopilot={() => setCopilotOpen(true)}
                />
                <DatasetSummaryCard context={overviewContext} />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr_1.18fr]">
                <BusinessDescriptionCard
                  businessArea={overviewContext.businessArea}
                  domain={overviewContext.domain}
                  dataType={overviewContext.dataType}
                  usage={overviewContext.usage}
                  onOpenCopilot={() => setCopilotOpen(true)}
                />
                <TermsCard terms={terms} onOpenCopilot={() => setCopilotOpen(true)} />
                <RelationshipsCard
                  datasetName={overviewContext.datasetName}
                  relationships={relationships.map((relationship) => ({
                    ingestionId: relationship.ingestion_id,
                    datasetName: relationship.dataset_name,
                    confidence: Math.round(relationship.confidence * 100),
                    sharedColumns: relationship.shared_columns.map(humanize),
                  }))}
                />
              </div>

              <QualityCard quality={quality} />

              {previewColumns.length ? <DataPreviewTable rows={previewRows} columns={previewColumns} /> : null}

              <DataTable
                title="Schema Signals"
                description="Keep technical details available, but secondary to understanding and business context."
                columns={schemaColumns}
                data={schemaRows}
                searchPlaceholder="Search schema warnings"
              />
            </div>

            <aside className="space-y-6">
              <OverviewCopilotRail
                context={overviewContext}
                draft={copilotDraft}
                open={copilotOpen}
                isThinking={copilotThinking}
                prompts={overviewCopilotPrompts}
                onDraftChange={setCopilotDraft}
                onOpen={() => setCopilotOpen(true)}
                onSubmit={handleCopilotSubmit}
              />
            </aside>
          </div>

          <OverviewCopilotDrawer
            context={overviewContext}
            draft={copilotDraft}
            open={copilotOpen}
            isThinking={copilotThinking}
            messages={copilotMessages}
            prompts={overviewCopilotPrompts}
            onClose={() => setCopilotOpen(false)}
            onDraftChange={setCopilotDraft}
            onSubmit={handleCopilotSubmit}
          />
        </>
      ) : null}
    </div>
  );
}

type SchemaRow = {
  normalized_name: string;
  inferred_type: string;
  cast_success_rate?: number | null;
  warnings?: string[];
};

function OverviewTabs() {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E7EB] pb-2">
      {["Overview", "Data", "Schema", "Insights", "Lineage"].map((tab, index) => (
        <button
          key={tab}
          type="button"
          className={[
            "rounded-full px-4 py-2 text-sm font-medium transition",
            index === 0 ? "bg-[#F3F1FF] text-[#6E5BFF]" : "text-[#6B7280] hover:bg-[#FAFBFC] hover:text-[#111827]",
          ].join(" ")}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function DatasetHeroCard(args: {
  datasetName: string;
  classification: string;
  tags: string[];
  statusLabel: string;
  updatedAt: string;
}) {
  const { datasetName, classification, tags, statusLabel, updatedAt } = args;
  return (
    <Card>
      <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="flex items-start gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#22C55E_0%,#16A34A_100%)] text-white shadow-sm">
            <FileSpreadsheet aria-hidden="true" className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-4xl font-bold tracking-normal text-[#111827]">{datasetName}</h2>
              <Badge variant={statusLabel === "Ready to use" ? "success" : "info"}>{statusLabel}</Badge>
            </div>
            <p className="mt-3 text-xl text-[#6B7280]">{classification}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-2xl border border-[#EEF2F7] bg-[#FAFBFC] p-5">
          <div>
            <p className="text-sm font-medium text-[#6B7280]">Last updated</p>
            <p className="mt-2 text-2xl font-semibold text-[#111827]">{updatedAt}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AiUnderstandingCard(args: {
  summaryText: string;
  confidence: string;
  onOpenCopilot: () => void;
}) {
  const { summaryText, confidence, onOpenCopilot } = args;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3F1FF] text-[#6E5BFF]">
              <Brain aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-3xl">AI Understanding</CardTitle>
              <CardDescription className="mt-1">The first thing users should see is understanding.</CardDescription>
            </div>
          </div>
          <Badge variant="success">AI Confidence {confidence}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="max-w-3xl text-base leading-8 text-[#374151]">{summaryText}</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" type="button" onClick={onOpenCopilot}>
            Refine with Copilot
            <Sparkles aria-hidden="true" />
          </Button>
          <Button variant="ghost" type="button" onClick={onOpenCopilot}>
            View full analysis
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DatasetSummaryCard({
  context,
}: {
  context: {
    rows: string;
    columns: string;
    size: string;
    language: string;
    qualityScore: string;
    createdAt: string;
    sourceLabel: string;
    tableName: string;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dataset Summary</CardTitle>
        <CardDescription>Quick factual context before deeper analysis.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryFact icon={<TableProperties aria-hidden="true" className="h-4 w-4" />} label="Rows" value={context.rows} />
          <SummaryFact icon={<Database aria-hidden="true" className="h-4 w-4" />} label="Columns" value={context.columns} />
          <SummaryFact icon={<FileSpreadsheet aria-hidden="true" className="h-4 w-4" />} label="Size" value={context.size} />
          <SummaryFact icon={<Sparkles aria-hidden="true" className="h-4 w-4" />} label="Language" value={context.language} />
          <SummaryFact icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />} label="Quality Score" value={context.qualityScore} />
          <SummaryFact icon={<RefreshCw aria-hidden="true" className="h-4 w-4" />} label="Created" value={context.createdAt} />
        </div>
        <div className="grid gap-4 border-t border-[#EEF2F7] pt-5 md:grid-cols-2">
          <InfoLine label="Source" value={context.sourceLabel} />
          <InfoLine label="Table" value={context.tableName} />
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#EEF2F7] bg-[#FAFBFC] px-4 py-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#6E5BFF] shadow-sm">{icon}</span>
      <p className="mt-3 text-3xl font-bold text-[#111827]">{value}</p>
      <p className="mt-1 text-sm text-[#6B7280]">{label}</p>
    </div>
  );
}

function BusinessDescriptionCard(args: {
  businessArea: string;
  domain: string;
  dataType: string;
  usage: string[];
  onOpenCopilot: () => void;
}) {
  const { businessArea, domain, dataType, usage, onOpenCopilot } = args;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Description</CardTitle>
        <CardDescription>Convert technical structure into business meaning.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <InfoLine label="Business Area" value={businessArea} />
        <InfoLine label="Domain" value={domain} />
        <InfoLine label="Data Type" value={dataType} />
        <InfoLine label="Usage" value={usage.join(", ") || "-"} />
        <Button variant="secondary" className="w-full" type="button" onClick={onOpenCopilot}>
          Refine with Copilot
          <Sparkles aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  );
}

function TermsCard({ terms, onOpenCopilot }: { terms: string[]; onOpenCopilot: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Key Business Terms</CardTitle>
        <CardDescription>Automatic glossary generation for non-technical users.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {terms.length > 0 ? (
            terms.map((term) => (
              <Badge key={term} variant="success">
                {term}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-[#6B7280]">No business terms inferred yet.</p>
          )}
        </div>
        <Button variant="ghost" type="button" onClick={onOpenCopilot}>
          View all terms
          <ArrowRight aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  );
}

function RelationshipsCard(args: {
  datasetName: string;
  relationships: Array<{
    ingestionId: string;
    datasetName: string;
    confidence: number;
    sharedColumns: string[];
  }>;
}) {
  const { datasetName, relationships } = args;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Link2 aria-hidden="true" className="h-5 w-5 text-[#6E5BFF]" />
          <CardTitle>Relationships</CardTitle>
        </div>
        <CardDescription>Understand how this dataset connects to the broader tenant knowledge graph.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl border border-[#EEF2F7] bg-[#FAFBFC] px-4 py-4">
          <div className="mx-auto max-w-[440px] space-y-4">
            <div className="mx-auto flex max-w-[220px] items-center justify-center rounded-2xl border border-[#DDE4F1] bg-white px-4 py-3 text-center">
              <div>
                <p className="text-sm font-semibold text-[#111827]">{datasetName}</p>
                <p className="text-xs text-[#6B7280]">(This dataset)</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {relationships.length > 0 ? (
                relationships.map((relationship) => (
                  <div key={relationship.ingestionId} className="rounded-2xl border border-[#DDE4F1] bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[#111827]">{relationship.datasetName}</p>
                      <Badge variant={relationship.confidence >= 85 ? "success" : "secondary"}>{relationship.confidence}%</Badge>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#6B7280]">{relationship.sharedColumns.join(", ")}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#6B7280]">No reliable relationships were inferred yet.</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type QualityInfo = NonNullable<IngestionOverviewResponse["overview"]>["quality"];

function QualityCard({ quality }: { quality?: QualityInfo | null }) {
  const metrics = quality
    ? [
        { label: "Completeness", value: `${Math.round(quality.completeness * 100)}%` },
        { label: "Uniqueness", value: `${Math.round(quality.uniqueness * 100)}%` },
        { label: "Validity", value: `${Math.round(quality.validity * 100)}%` },
        { label: "Consistency", value: `${Math.round(quality.consistency * 100)}%` },
        { label: "Timeliness", value: `${Math.round(quality.timeliness * 100)}%` },
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Data Quality</CardTitle>
            <CardDescription>Simple, understandable confidence indicators instead of technical QA jargon.</CardDescription>
          </div>
          <Button variant="ghost" type="button">
            View full report
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-[#EEF2F7] bg-[#FAFBFC] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-[8px] border-[#DCFCE7] text-2xl font-bold text-[#166534]">
                {quality ? Math.round(quality.overall_score * 100) : "-"}
              </div>
              <div>
                <p className="text-sm font-medium text-[#6B7280]">Overall Score</p>
                <p className="mt-1 text-3xl font-bold text-[#111827]">{quality ? `${Math.round(quality.overall_score * 100)}%` : "-"}</p>
                <p className="mt-1 text-sm text-[#16A34A]">High Quality</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {metrics.map((metric) => (
              <InfoLine key={metric.label} label={metric.label} value={metric.value} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function humanize(value?: string | null): string {
  if (!value) return "-";
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function InfoLine({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#FAFBFC] px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-[#6B7280]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#111827] break-words">{value || "-"}</p>
    </div>
  );
}
