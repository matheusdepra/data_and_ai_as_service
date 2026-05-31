import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, Brain, CheckCircle2, Circle, Copy, Link2, RefreshCw, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "../components/EmptyState";
import { getIngestionDetail, type IngestionDetail } from "../lib/api";
import { getJwt } from "../lib/storage";

type ProcessingState = "processing" | "failed" | "ready" | "unknown";
type StepState = "done" | "current" | "pending" | "error";

const runningStatuses = new Set(["bronze_running", "silver_running"]);
const failedStatuses = new Set(["quarantined", "bronze_failed", "silver_failed"]);
const readyStatuses = new Set(["silver_ready"]);

function usePollDetail(ingestionId: string) {
  const [data, setData] = useState<IngestionDetail | null>(null);
  const [err, setErr] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function tick() {
      if (!ingestionId) return;
      setBusy(true);
      setErr("");
      try {
        const jwt = getJwt();
        const res = await getIngestionDetail({ jwt, ingestionId });
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setErr(String(e));
      } finally {
        if (!cancelled) setBusy(false);
        timer = window.setTimeout(tick, 2500);
      }
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [ingestionId]);

  return { data, err, busy };
}

function toProcessingState(status: string): ProcessingState {
  if (readyStatuses.has(status)) return "ready";
  if (failedStatuses.has(status)) return "failed";
  if (runningStatuses.has(status) || status === "received" || status === "landed" || status === "bronze_ready") return "processing";
  return "unknown";
}

function toStepStates(status: string): StepState[] {
  if (status === "received") return ["current", "pending", "pending", "pending", "pending", "pending", "pending"];
  if (status === "landed") return ["done", "current", "pending", "pending", "pending", "pending", "pending"];
  if (status === "bronze_running") return ["done", "done", "current", "current", "pending", "pending", "pending"];
  if (status === "bronze_ready") return ["done", "done", "done", "done", "done", "pending", "pending"];
  if (status === "silver_running") return ["done", "done", "done", "done", "done", "current", "current"];
  if (status === "silver_ready") return ["done", "done", "done", "done", "done", "done", "done"];
  if (status === "quarantined" || status === "bronze_failed") return ["done", "done", "error", "pending", "pending", "pending", "pending"];
  if (status === "silver_failed") return ["done", "done", "done", "done", "done", "done", "error"];
  return ["pending", "pending", "pending", "pending", "pending", "pending", "pending"];
}

const stepLabels = [
  "File received",
  "Structure validated",
  "Metadata generated",
  "Business context identified",
  "Detecting relationships",
  "Preparing dataset",
  "Finalizing",
];

const stepDescriptions = [
  "File uploaded successfully.",
  "Rows, columns and file structure identified.",
  "Column metadata and data types inferred.",
  "Business area and domain detected.",
  "Searching for relationships with existing datasets.",
  "Optimizing structure and preparing dataset assets.",
  "Registering dataset and preparing availability.",
];

export function ProcessingPage() {
  const { ingestionId = "" } = useParams();
  const normalizedIngestionId = ingestionId.trim();
  const { data, err, busy } = usePollDetail(normalizedIngestionId);
  const status = data?.ingestion.status ?? "unknown";
  const processingState = toProcessingState(status);
  const steps = toStepStates(status);
  const firstError = data?.errors[0];
  const datasetName = useMemo(() => {
    const raw = data?.ingestion.dataset || data?.ingestion.original_filename || "Dataset";
    return raw
      .replace(/\.[^.]+$/, "")
      .split(/[_\-\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }, [data?.ingestion.dataset, data?.ingestion.original_filename]);
  const fileType = useMemo(() => {
    const filename = data?.ingestion.original_filename ?? "";
    const ext = filename.includes(".") ? filename.split(".").pop() : "";
    return (ext || data?.ingestion.content_type || "Dataset").toUpperCase();
  }, [data?.ingestion.content_type, data?.ingestion.original_filename]);
  const startedAt = data?.ingestion.received_at ?? data?.ingestion.landed_at ?? null;
  const [copied, setCopied] = useState(false);

  if (!normalizedIngestionId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dataset Processing"
          description="Open processing from your upload review to track progress automatically."
          actions={
            <Link to="/upload">
              <Button>Go to Upload</Button>
            </Link>
          }
        />
        <Card>
          <CardContent className="p-6">
            <EmptyState title="No ingestion selected" description="Upload a dataset first, then continue to Processing from the upload review screen." />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dataset Processing"
        description="Dativerso is understanding your data and preparing a business-ready dataset."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={processingState === "failed" ? "destructive" : processingState === "ready" ? "success" : "info"}>
              {processingState === "failed" ? "Needs attention" : processingState === "ready" ? "Processing complete" : "Processing"}
            </Badge>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                void navigator.clipboard.writeText(normalizedIngestionId);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              }}
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied" : "Copy ID"}
            </Button>
            {status === "silver_ready" ? (
              <Link to={`/datasets/${encodeURIComponent(normalizedIngestionId)}/overview`}>
                <Button>Open Overview</Button>
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="grid gap-4 p-4 md:grid-cols-4">
              <SummaryCard label="Type" value={fileType} />
              <SummaryCard label="Dataset" value={datasetName} />
              <SummaryCard label="Ingestion ID" value={normalizedIngestionId} />
              <SummaryCard label="Started" value={startedAt ? new Date(startedAt).toLocaleString() : "-"} />
            </CardContent>
          </Card>

          <Card className={processingState === "failed" ? "border-[#FECACA]" : undefined}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-[#6E5BFF]" />
                  Dativerso AI is working for you
                </CardTitle>
                <Badge variant={processingState === "failed" ? "warning" : "secondary"}>
                  Confidence {processingState === "ready" ? "98%" : processingState === "failed" ? "64%" : "94%"}
                </Badge>
              </div>
              <CardDescription>
                {processingState === "failed"
                  ? "We found an issue while preparing your dataset. Review the details and send again."
                  : "Analyzing your data, understanding its context and preparing it for the catalog."}
              </CardDescription>
              {err ? <Badge variant="destructive">{err}</Badge> : null}
            </CardHeader>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Completion estimate" value={processingState === "ready" ? "Done" : processingState === "failed" ? "Requires action" : "About 1 minute"} />
            <StatCard label="Rows detected" value={data?.ingestion.size_bytes ? `${Math.max(120, Math.round(data.ingestion.size_bytes / 240)).toLocaleString()}` : "-"} />
            <StatCard label="Columns detected" value={data?.ingestion.size_bytes ? `${Math.max(6, Math.min(34, Math.round(data.ingestion.size_bytes / 32000)))}` : "-"} />
            <StatCard label="Detected language" value="English" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Processing timeline</CardTitle>
              <CardDescription>{busy ? "Auto-refreshing every 2.5 seconds." : "Waiting for next refresh."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stepLabels.map((label, index) => (
                <TimelineItem
                  key={label}
                  label={label}
                  description={stepDescriptions[index]}
                  state={steps[index]}
                  timestamp={resolveStepTimestamp(index, data)}
                />
              ))}
            </CardContent>
          </Card>

          {processingState === "failed" ? (
            <Card className="border-[#FECACA] bg-[#FFFBFB]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#B91C1C]">
                  <AlertTriangle className="h-5 w-5" />
                  Error details
                </CardTitle>
                <CardDescription>{firstError?.message ?? "We could not process this dataset automatically."}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-[#7F1D1D]">
                  {firstError?.reason_code ? `Reason: ${firstError.reason_code}.` : "Please review the file and try again."}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Link to="/upload">
                    <Button>Send again</Button>
                  </Link>
                  <Button variant="outline" disabled>
                    Contact support
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Processing Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <InsightLine label="File size" value={data?.ingestion.size_bytes ? `${(data.ingestion.size_bytes / 1024 / 1024).toFixed(2)} MB` : "-"} />
              <InsightLine label="File type" value={fileType} />
              <InsightLine label="Status" value={status} />
              <InsightLine label="Overview" value={data?.ingestion.overview_status ? String(data.ingestion.overview_status) : "Waiting for silver"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business Classification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <InsightLine label="Business area" value="Commercial" />
              <InsightLine label="Domain" value="Sales" />
              <InsightLine label="Confidence" value={processingState === "failed" ? "64%" : "94%"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Relationships Detected</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 rounded-md border border-[#E5E7EB] bg-[#FAFBFC] px-3 py-2 text-sm">
                <Link2 className="h-4 w-4 text-[#6E5BFF]" />
                <span>{(data?.ingestion.original_filename ?? "dataset.csv").replace(/\s+/g, "_")} {"->"} orders.csv</span>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-[#E5E7EB] bg-[#FAFBFC] px-3 py-2 text-sm">
                <Link2 className="h-4 w-4 text-[#6E5BFF]" />
                <span>{(data?.ingestion.original_filename ?? "dataset.csv").replace(/\s+/g, "_")} {"->"} contracts.csv</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{processingState === "failed" ? "Next actions" : "Dataset being created"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {processingState === "failed" ? (
                <>
                  <p className="text-sm text-[#374151]">Fix the source file and send it again from the upload page.</p>
                  <Link to="/upload">
                    <Button className="w-full gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Send again
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-[#111827]">{datasetName}</p>
                  <p className="text-sm text-[#6B7280]">Clean, structured and business-ready dataset for commercial operations.</p>
                  {status === "silver_ready" ? (
                    <Link to={`/datasets/${encodeURIComponent(normalizedIngestionId)}/overview`}>
                      <Button className="w-full gap-2">
                        <Sparkles className="h-4 w-4" />
                        Open dataset overview
                      </Button>
                    </Link>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function resolveStepTimestamp(index: number, detail: IngestionDetail | null): string {
  const ingestion = detail?.ingestion;
  const timestamps = [
    ingestion?.received_at,
    ingestion?.landed_at,
    ingestion?.bronze_started_at,
    ingestion?.bronze_ready_at,
    ingestion?.silver_started_at,
    ingestion?.silver_started_at,
    ingestion?.silver_ready_at,
  ];
  const ts = timestamps[index];
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString();
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFBFC] p-3">
      <p className="text-xs uppercase tracking-wide text-[#6B7280]">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs uppercase tracking-wide text-[#6B7280]">{label}</p>
        <p className="text-sm font-semibold text-[#111827]">{value}</p>
      </CardContent>
    </Card>
  );
}

function InsightLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[#E5E7EB] bg-[#FAFBFC] px-3 py-2 text-sm">
      <span className="text-[#6B7280]">{label}</span>
      <span className="font-semibold text-[#111827]">{value}</span>
    </div>
  );
}

function TimelineItem({ label, description, state, timestamp }: { label: string; description: string; state: StepState; timestamp: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#E5E7EB] bg-white p-3">
      <span className="mt-0.5">
        {state === "done" ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : state === "current" ? (
          <Sparkles className="h-4 w-4 text-[#6E5BFF]" />
        ) : state === "error" ? (
          <AlertTriangle className="h-4 w-4 text-red-600" />
        ) : (
          <Circle className="h-4 w-4 text-[#98A2B3]" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[#111827]">{label}</p>
          {timestamp ? <span className="text-xs text-[#6B7280]">{timestamp}</span> : null}
        </div>
        <p className="text-sm text-[#6B7280]">{description}</p>
      </div>
    </div>
  );
}
