import { useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Link, useParams } from "react-router-dom";
import { Brain, Database, Link2, Sparkles } from "lucide-react";

import { DataPreviewTable } from "@/components/data/DataPreviewTable";
import { DataTable } from "@/components/data/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { AssistantPanel } from "@/components/shared/AssistantPanel";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { MetricCard } from "@/components/shared/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getIngestionDetail, getIngestionOverview, runIngestionOverview, type IngestionDetail, type IngestionOverviewResponse } from "../lib/api";
import { friendlyStatus } from "../lib/ingestion";
import { getJwt } from "../lib/storage";


export function DatasetOverviewPage() {
  const { ingestionId = "" } = useParams();
  const normalizedIngestionId = ingestionId.trim();
  const [detail, setDetail] = useState<IngestionDetail | null>(null);
  const [overview, setOverview] = useState<IngestionOverviewResponse | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");
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
            // Let polling surface the real backend state/error.
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
  const header = overview?.overview?.dataset_header;
  const aiUnderstanding = overview?.overview?.ai_understanding;
  const summary = overview?.overview?.summary;
  const quality = overview?.overview?.quality;
  const business = overview?.overview?.business_description;
  const schemaRows = (overview?.overview?.schema?.columns || []) as SchemaRow[];
  const previewRows = overview?.overview?.preview_rows || [];
  const relationships = overview?.overview?.relationships || [];
  const terms = overview?.overview?.terms || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={header?.name || humanize(detail?.ingestion.collection_slug || detail?.ingestion.dataset || "dataset")}
        description="Review the inferred business meaning, data quality and preview generated from the ready-to-use Silver dataset."
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge variant={overviewStatus === "ready" ? "success" : overviewStatus === "failed" ? "warning" : "info"}>
              {overviewStatus === "ready" ? "Overview ready" : overviewStatus === "failed" ? "Needs retry" : "Preparing overview"}
            </Badge>
            <Button variant="outline" asChild>
              <Link to="/ingestions">Back to Ingestions</Link>
            </Button>
          </div>
        }
      />

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
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-2xl">{header?.name || "Dataset Overview"}</CardTitle>
                    <CardDescription>{header?.classification || friendlyStatus(detail?.ingestion.status || "")}</CardDescription>
                  </div>
                  <Badge variant={detail?.ingestion.status === "silver_ready" ? "success" : "info"}>
                    {detail?.ingestion.status ? friendlyStatus(detail.ingestion.status) : "Preparing"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {(header?.tags || []).map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard label="Rows" value={summary?.rows?.toLocaleString() || "-"} />
              <MetricCard label="Columns" value={summary?.columns ?? "-"} />
              <MetricCard label="Quality score" value={quality ? `${Math.round(quality.overall_score * 100)}%` : "-"} />
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-[#6E5BFF]" />
                  <CardTitle>AI Understanding</CardTitle>
                </div>
                <CardDescription>{aiUnderstanding ? `Confidence ${Math.round(aiUnderstanding.confidence * 100)}%` : "Waiting for backend analysis."}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-[#374151]">
                  {aiUnderstanding?.summary || "Dativerso is still preparing the business understanding for this dataset."}
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Business Description</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <InfoLine label="Business area" value={business?.business_area} />
                  <InfoLine label="Domain" value={business?.domain} />
                  <InfoLine label="Data type" value={business?.data_type} />
                  <InfoLine label="Usage" value={business?.typical_usage?.join(", ")} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Quality</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <InfoLine label="Completeness" value={quality ? `${Math.round(quality.completeness * 100)}%` : "-"} />
                  <InfoLine label="Uniqueness" value={quality ? `${Math.round(quality.uniqueness * 100)}%` : "-"} />
                  <InfoLine label="Validity" value={quality ? `${Math.round(quality.validity * 100)}%` : "-"} />
                  <InfoLine label="Consistency" value={quality ? `${Math.round(quality.consistency * 100)}%` : "-"} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Key Business Terms</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {terms.length ? terms.map((term) => <Badge key={term} variant="outline">{term}</Badge>) : <p className="text-sm text-[#6B7280]">No business terms inferred yet.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-[#6E5BFF]" />
                  <CardTitle>Relationships</CardTitle>
                </div>
                <CardDescription>Connections inferred from shared normalized columns across your tenant datasets.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {relationships.length ? (
                  relationships.map((relationship) => (
                    <div key={relationship.ingestion_id} className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#FAFBFC] px-4 py-3">
                      <div>
                        <p className="font-semibold text-[#111827]">{relationship.dataset_name}</p>
                        <p className="text-sm text-[#6B7280]">{relationship.shared_columns.map(humanize).join(", ")}</p>
                      </div>
                      <Badge variant="secondary">{Math.round(relationship.confidence * 100)}%</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#6B7280]">No reliable relationships inferred yet from the current tenant history.</p>
                )}
              </CardContent>
            </Card>

            <DataTable
              title="Normalized Schema"
              description="Types and warnings inferred by the backend pipeline from the Silver materialization."
              columns={schemaColumns}
              data={schemaRows}
              searchPlaceholder="Search normalized schema"
            />

            {previewColumns.length ? <DataPreviewTable rows={previewRows} columns={previewColumns} /> : null}
          </div>

          <div className="space-y-6">
            <AssistantPanel
              title="Copilot Panel"
              placeholder="Ask about this dataset"
              suggestions={[
                "Explain the business context",
                "Show columns with warnings",
                "Summarize quality issues",
              ]}
            />

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-[#6E5BFF]" />
                  <CardTitle>Dataset Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoLine label="Source" value={humanize(detail?.ingestion.source || "upload")} />
                <InfoLine label="Language" value={summary?.language} />
                <InfoLine label="Created" value={formatDateTime(summary?.created_date)} />
                <InfoLine label="Table" value={detail?.ingestion.technical_summary?.bq_table} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#6E5BFF]" />
                  <CardTitle>Next Actions</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-[#374151]">
                  Review the normalized schema, validate the inferred context and use this ingestion as the source of truth for the next dataset iteration.
                </p>
                <Button variant="outline" asChild>
                  <Link to={`/processing/${encodeURIComponent(normalizedIngestionId)}`}>Open processing history</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}


type SchemaRow = {
  original_name: string;
  normalized_name: string;
  source_type: string;
  inferred_type: string;
  cast_success_rate?: number | null;
  warnings?: string[];
};


function humanize(value?: string | null): string {
  if (!value) return "-";
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}


function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}


function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}


function InfoLine({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFBFC] px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-[#6B7280]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#111827]">{value || "-"}</p>
    </div>
  );
}
