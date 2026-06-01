import { useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Brain,
  Database,
  FileSpreadsheet,
  Globe2,
  Link2,
  Languages,
  ShieldCheck,
  Sparkles,
  TableProperties,
} from "lucide-react";

import { DataPreviewTable } from "@/components/data/DataPreviewTable";
import { DataTable } from "@/components/data/DataTable";
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
  formatOverviewCopilotReply,
} from "@/features/overview/services/overview-copilot-service";
import type { OverviewCopilotMessage } from "@/features/overview/types";

import {
  getIngestionDetail,
  getIngestionOverview,
  runIngestionOverview,
  sendOverviewCopilotMessage,
  type IngestionDetail,
  type IngestionOverviewResponse,
} from "../lib/api";
import { getJwt } from "../lib/storage";

export function DatasetOverviewPage() {
  const { ingestionId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const normalizedIngestionId = ingestionId.trim();
  const [detail, setDetail] = useState<IngestionDetail | null>(null);
  const [overview, setOverview] = useState<IngestionOverviewResponse | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotDraft, setCopilotDraft] = useState("");
  const [copilotThinking, setCopilotThinking] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState<OverviewCopilotMessage[]>([]);
  const copilotSessionId = useRef(crypto.randomUUID());
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
  const activeTab = getOverviewTab(searchParams.get("tab"));
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
    copilotSessionId.current = crypto.randomUUID();
  }, [overviewContext.ingestionId, overviewContext.datasetName]);

  if (busy && !overview) {
    return <LoadingState rows={4} label="Loading dataset overview" />;
  }

  async function handleCopilotSubmit(question: string) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || copilotThinking) return;

    setCopilotOpen(true);
    setCopilotDraft("");
    setCopilotMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", body: cleanQuestion }]);
    setCopilotThinking(true);
    try {
      const jwt = getJwt();
      const response = await sendOverviewCopilotMessage({
        jwt,
        sessionId: copilotSessionId.current,
        ingestionId: normalizedIngestionId,
        message: cleanQuestion,
      });
      const reply = formatOverviewCopilotReply({ context: overviewContext, question: cleanQuestion, response });
      setCopilotMessages((prev) => [...prev, reply]);
    } catch (error) {
      setCopilotMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          title: "Copilot unavailable",
          body: error instanceof Error ? error.message : "The dataset copilot could not answer right now.",
        },
      ]);
    } finally {
      setCopilotThinking(false);
    }
  }

  return (
    <div className="space-y-6">
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
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-start">
            <div className="space-y-4">
              <DatasetHeroCard
                datasetName={overviewContext.datasetName}
                classification={overviewContext.classification}
                tags={overviewContext.tags}
                statusLabel={overviewContext.statusLabel}
                overviewStatus={overviewStatus}
                updatedAt={overviewContext.updatedAt}
              />

              <OverviewTabs
                activeTab={activeTab}
                onChange={(tab) => {
                  const next = new URLSearchParams(searchParams);
                  if (tab === "overview") {
                    next.delete("tab");
                  } else {
                    next.set("tab", tab);
                  }
                  setSearchParams(next, { replace: true });
                }}
              />

      {activeTab === "overview" ? (
                <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
                  <AiUnderstandingCard
                    summaryText={overviewContext.understanding}
                    confidence={overviewContext.confidence}
                    onOpenCopilot={() => setCopilotOpen(true)}
                  />
                  <DatasetSummaryCard context={overviewContext} />
                </div>
              ) : null}

              {activeTab === "data" ? (
                previewColumns.length ? (
                  <DataPreviewTable rows={previewRows} columns={previewColumns} />
                ) : (
                  <TabEmptyState
                    title="Data preview not available yet"
                    description="Dativerso still has no preview rows for this dataset."
                  />
                )
              ) : null}

              {activeTab === "schema" ? (
                <DataTable
                  title="Schema Signals"
                  description="Keep technical details available, but secondary to understanding and business context."
                  columns={schemaColumns}
                  data={schemaRows}
                  searchPlaceholder="Search schema warnings"
                />
              ) : null}

              {activeTab === "insights" ? (
                <>
                  <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                    <BusinessDescriptionCard
                      businessArea={overviewContext.businessArea}
                      domain={overviewContext.domain}
                      dataType={overviewContext.dataType}
                      usage={overviewContext.usage}
                      onOpenCopilot={() => setCopilotOpen(true)}
                    />
                    <TermsCard terms={terms} onOpenCopilot={() => setCopilotOpen(true)} />
                  </div>
                  <QualityCard quality={quality} />
                </>
              ) : null}

              {activeTab === "lineage" ? (
                <RelationshipsCard
                  datasetName={overviewContext.datasetName}
                  relationships={relationships.map((relationship) => ({
                    ingestionId: relationship.ingestion_id,
                    datasetName: relationship.dataset_name,
                    confidence: Math.round(relationship.confidence * 100),
                    sharedColumns: relationship.shared_columns.map(humanize),
                  }))}
                />
              ) : null}
            </div>

            <aside className="xl:h-full">
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

type OverviewTab = "overview" | "data" | "schema" | "insights" | "lineage";

function OverviewTabs({
  activeTab,
  onChange,
}: {
  activeTab: OverviewTab;
  onChange: (tab: OverviewTab) => void;
}) {
  const tabs: Array<{ id: OverviewTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "data", label: "Data" },
    { id: "schema", label: "Schema" },
    { id: "insights", label: "Insights" },
    { id: "lineage", label: "Lineage" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E7EB] pb-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-pressed={activeTab === tab.id}
          className={[
            "rounded-full border px-4 py-2 text-sm font-medium transition",
            activeTab === tab.id
              ? "border-[#6E5BFF] bg-[#F3F1FF] text-[#6E5BFF]"
              : "border-transparent text-[#6B7280] hover:border-[#E5E7EB] hover:bg-[#FAFBFC] hover:text-[#111827]",
          ].join(" ")}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
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
  overviewStatus: string;
  updatedAt: string;
}) {
  const { datasetName, classification, tags, statusLabel, overviewStatus, updatedAt } = args;
  return (
    <section className="rounded-[28px] bg-[#F8F9FC] px-6 py-5">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
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
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-[#6B7280] xl:justify-end">
            <span>
              Last updated <span className="font-semibold text-[#111827]">{updatedAt}</span>
            </span>
            <Badge
              variant={overviewStatus === "ready" ? "success" : overviewStatus === "failed" ? "warning" : "info"}
              className="rounded-full px-3 py-1 text-sm"
            >
              {overviewStatus === "ready" ? "Overview ready" : overviewStatus === "failed" ? "Needs retry" : "Preparing overview"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </section>
  );
}

function AiUnderstandingCard(args: {
  summaryText: string;
  confidence: string;
  onOpenCopilot: () => void;
}) {
  const { summaryText, confidence, onOpenCopilot } = args;
  return (
    <Card className="min-h-[420px]">
      <CardHeader className="p-5 pb-3">
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
      <CardContent className="space-y-5 p-5 pt-0">
        <p className="max-w-3xl text-base leading-8 text-[#374151] line-clamp-4">{summaryText}</p>
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
  };
}) {
  const facts = [
    {
      label: "Rows",
      value: formatSummaryRows(context.rows),
      icon: <TableProperties aria-hidden="true" className="h-4 w-4" />,
      iconClassName: "bg-[#EEF2FF] text-[#5F4CF0]",
    },
    {
      label: "Columns",
      value: context.columns,
      icon: <Database aria-hidden="true" className="h-4 w-4" />,
      iconClassName: "bg-[#ECFDF3] text-[#16A34A]",
    },
    {
      label: "Size",
      value: context.size,
      icon: <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />,
      iconClassName: "bg-[#FFF7ED] text-[#EA580C]",
    },
    {
      label: "Language",
      value: formatSummaryLanguage(context.language),
      icon: <Languages aria-hidden="true" className="h-4 w-4" />,
      iconClassName: "bg-[#F5F3FF] text-[#7C3AED]",
    },
    {
      label: "Quality Score",
      value: context.qualityScore,
      icon: <ShieldCheck aria-hidden="true" className="h-4 w-4" />,
      iconClassName: "bg-[#ECFEFF] text-[#0891B2]",
    },
    {
      label: "Created",
      value: formatSummaryDate(context.createdAt),
      icon: <Globe2 aria-hidden="true" className="h-4 w-4" />,
      iconClassName: "bg-[#FEF2F2] text-[#DC2626]",
    },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-5 pb-4">
        <CardTitle>Dataset Summary</CardTitle>
        <CardDescription>Quick factual context before deeper analysis.</CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {facts.map((fact) => (
            <SummaryFact
              key={fact.label}
              icon={fact.icon}
              iconClassName={fact.iconClassName}
              label={fact.label}
              value={fact.value}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryFact({
  icon,
  iconClassName,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconClassName: string;
  label: string;
  value: string;
}) {
  return (
    <div className="min-h-[132px] min-w-0 rounded-2xl border border-[#EEF2F7] bg-[#FAFBFC] p-4">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${iconClassName}`}>{icon}</span>
      <p className="mt-4 whitespace-nowrap text-[16px] font-bold leading-none text-[#111827]" title={value}>
        {value}
      </p>
      <p className="mt-2 text-sm text-[#6B7280]">{label}</p>
    </div>
  );
}

function formatSummaryRows(value: string): string {
  if (!value || value === "-") return value;
  const numeric = Number(value.replace(/[^\d]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return value;
  if (numeric >= 1_000_000) return `${(numeric / 1_000_000).toFixed(1)}M`;
  if (numeric >= 100_000) return `${(numeric / 1_000).toFixed(1)}K`;
  return value;
}

function formatSummaryDate(value: string): string {
  if (!value || value === "-") return value;
  return value.split(",")[0]?.trim() || value;
}

function formatSummaryLanguage(value: string): string {
  if (!value || value === "-") return value;
  return value.length > 12 ? value.slice(0, 12) : value;
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

function TabEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function getOverviewTab(value: string | null): OverviewTab {
  switch (value) {
    case "data":
    case "schema":
    case "insights":
    case "lineage":
      return value;
    default:
      return "overview";
  }
}
