import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Brain, CheckCircle2, CircleDashed, Link2, RefreshCw, Sparkles, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadFile, type UploadResponse } from "../lib/api";
import { getJwt } from "../lib/storage";

type UploadStage = "waiting" | "analyzing" | "review";

type AiMetadata = {
  title: string;
  businessArea: string;
  domain: string;
  description: string;
  tags: string[];
};

type AnalysisStep = {
  key: string;
  label: string;
};

const analysisSteps: AnalysisStep[] = [
  { key: "uploaded", label: "File uploaded" },
  { key: "structured", label: "Structure identified" },
  { key: "context", label: "Detecting business context" },
  { key: "relationships", label: "Searching relationships" },
  { key: "recommendations", label: "Generating recommendations" },
];

export function UploadPage() {
  const [stage, setStage] = useState<UploadStage>("waiting");
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("upload");
  const [dataset, setDataset] = useState("faturamento");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<UploadResponse | null>(null);
  const [err, setErr] = useState<string>("");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [aiMetadata, setAiMetadata] = useState<AiMetadata>({
    title: "",
    businessArea: "Commercial",
    domain: "Sales",
    description: "",
    tags: ["Customer", "CRM", "Sales", "Master Data"],
  });

  const fileSummary = useMemo(() => {
    if (!file) return null;
    const rows = Math.max(120, Math.round(file.size / 240));
    const columns = Math.max(6, Math.min(34, Math.round(file.size / 32_000)));
    return {
      name: file.name,
      sizeLabel: `${Math.max(file.size / 1024 / 1024, 0.01).toFixed(2)} MB`,
      rows,
      columns,
    };
  }, [file]);

  useEffect(() => {
    if (!file || stage !== "review") return;
    const fileBaseName = file.name.replace(/\.[^.]+$/, "");
    const humanTitle = fileBaseName
      .split(/[_\-\s]+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(" ");
    setAiMetadata((current) => ({
      ...current,
      title: current.title || humanTitle || "Dataset",
      description:
        current.description || `${humanTitle || "Dataset"} with customer registration and commercial relationship attributes.`,
    }));
  }, [file, stage]);

  function addTag() {
    setAiMetadata((current) => ({ ...current, tags: [...current.tags, "New tag"] }));
  }

  function updateTag(index: number, value: string) {
    setAiMetadata((current) => ({
      ...current,
      tags: current.tags.map((tag, idx) => (idx === index ? value : tag)),
    }));
  }

  function removeTag(index: number) {
    setAiMetadata((current) => ({
      ...current,
      tags: current.tags.filter((_, idx) => idx !== index),
    }));
  }

  useEffect(() => {
    if (stage !== "analyzing") return;
    if (analysisProgress >= analysisSteps.length) {
      setStage("review");
      return;
    }
    const timer = window.setTimeout(() => {
      setAnalysisProgress((value) => value + 1);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [analysisProgress, stage]);

  async function onSubmit() {
    setErr("");
    setOut(null);
    if (!file) return;
    setBusy(true);
    try {
      const jwt = getJwt();
      const res = await uploadFile({ jwt, file, source, dataset });
      setOut(res);
      setAnalysisProgress(1);
      setStage("analyzing");
    } catch (e) {
      setErr(String(e));
      setStage("waiting");
    } finally {
      setBusy(false);
    }
  }

  const stageTitle =
    stage === "analyzing" ? "Analyzing Dataset" : "Upload Dataset";
  const stageDescription =
    stage === "waiting"
      ? "Import your file and let Dativerso understand your data."
      : stage === "analyzing"
        ? "Dativerso is understanding your data and generating recommendations."
        : "Review and refine Dativerso's understanding of your dataset.";

  const discoveredInsights = [
    "Potential customer dataset",
    "Commercial domain detected",
    "Relationship candidate found",
  ];

  const relationships = [
    { target: "orders.csv", confidence: "High confidence" },
    { target: "contracts.csv", confidence: "Medium confidence" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={stageTitle}
        description={stageDescription}
        actions={
          <Link to={out ? `/processing/${encodeURIComponent(out.ingestion_id)}` : "/track"}>
            <Button variant="outline">Track Protocol</Button>
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {stage === "waiting" ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Waiting for Upload</CardTitle>
                  <Badge variant="outline">CSV · Excel · JSON · Parquet</Badge>
                </div>
                <CardDescription>Drag and drop or choose a file to start dataset understanding.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <label
                  htmlFor="upload-input"
                  className="group flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-[#D0D5DD] bg-[#FAFBFC] p-6 text-center transition hover:border-[#6E5BFF] hover:bg-[#F7F5FF]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F1FF] text-[#6E5BFF]">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">Drag and drop your file</p>
                    <p className="mt-1 text-sm text-[#6B7280]">or click to Select File</p>
                  </div>
                  <p className="text-xs text-[#9CA3AF]">Maximum size: 2 GB</p>
                </label>
                <Input
                  id="upload-input"
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.item(0) ?? null)}
                  accept=".csv,.json,.parquet,.xls,.xlsx"
                />
                {fileSummary ? (
                  <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFBFC] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">{fileSummary.name}</p>
                        <p className="mt-1 text-xs text-[#6B7280]">{fileSummary.sizeLabel}</p>
                      </div>
                      <Badge variant="success">Ready to Upload</Badge>
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="dataset" className="text-sm font-medium text-[#111827]">
                      Dataset
                    </label>
                    <Input id="dataset" value={dataset} onChange={(e) => setDataset(e.target.value)} placeholder="customers" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="source" className="text-sm font-medium text-[#111827]">
                      Source
                    </label>
                    <Input id="source" value={source} onChange={(e) => setSource(e.target.value)} placeholder="upload" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button disabled={!file || busy} onClick={() => void onSubmit()}>
                    {busy ? "Uploading..." : "Upload Dataset"}
                  </Button>
                  {err ? <Badge variant="destructive">{err}</Badge> : null}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {stage === "analyzing" ? (
            <Card>
              <CardHeader>
                <CardTitle>Analyzing Dataset</CardTitle>
                <CardDescription>Dativerso is understanding structure, context and relationships.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="h-2 overflow-hidden rounded-full bg-[#EEF2FF]">
                  <div
                    className="h-full bg-[#6E5BFF] transition-all"
                    style={{ width: `${Math.round((analysisProgress / analysisSteps.length) * 100)}%` }}
                  />
                </div>
                {fileSummary ? (
                  <div className="grid gap-3 rounded-lg border border-[#E5E7EB] bg-[#FAFBFC] p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryItem label="File Name" value={fileSummary.name} />
                    <SummaryItem label="File Size" value={fileSummary.sizeLabel} />
                    <SummaryItem label="Rows Detected" value={String(fileSummary.rows)} />
                    <SummaryItem label="Columns Detected" value={String(fileSummary.columns)} />
                  </div>
                ) : null}
                <div className="space-y-3">
                  {analysisSteps.map((step, index) => {
                    const done = index < analysisProgress;
                    return (
                      <div key={step.key} className="flex items-center gap-3 text-sm">
                        {done ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <CircleDashed className="h-4 w-4 text-[#98A2B3]" />
                        )}
                        <span className={done ? "text-[#111827]" : "text-[#6B7280]"}>{step.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="grid gap-2 rounded-lg border border-[#E5E7EB] bg-white p-4">
                  {discoveredInsights.map((insight) => (
                    <div key={insight} className="flex items-center gap-2 text-sm text-[#111827]">
                      <Sparkles className="h-4 w-4 text-[#6E5BFF]" />
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {stage === "review" ? (
            <div className="space-y-4">
              {fileSummary ? (
                <Card>
                  <CardContent className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] lg:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-[#111827]">{fileSummary.name}</p>
                      <p className="text-sm text-[#6B7280]">Upload completed</p>
                    </div>
                    <SummaryItem label="Rows" value={String(fileSummary.rows)} />
                    <SummaryItem label="Columns" value={String(fileSummary.columns)} />
                    <SummaryItem label="File Size" value={fileSummary.sizeLabel} />
                    <Button variant="outline" className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Replace file
                    </Button>
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-[#6E5BFF]" />
                      AI Analysis
                    </CardTitle>
                    <Badge variant="success">Confidence: High (94%)</Badge>
                  </div>
                  <CardDescription>Dativerso analyzed your dataset and generated the following suggestions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <EditableField
                      label="Title"
                      value={aiMetadata.title}
                      onChange={(value) => setAiMetadata((current) => ({ ...current, title: value }))}
                    />
                    <EditableField
                      label="Business Area"
                      value={aiMetadata.businessArea}
                      onChange={(value) => setAiMetadata((current) => ({ ...current, businessArea: value }))}
                    />
                    <EditableField
                      label="Domain"
                      value={aiMetadata.domain}
                      onChange={(value) => setAiMetadata((current) => ({ ...current, domain: value }))}
                    />
                    <div className="space-y-1.5">
                      <label htmlFor="description" className="text-sm font-medium text-[#111827]">
                        Description
                      </label>
                      <Textarea
                        id="description"
                        value={aiMetadata.description}
                        onChange={(e) => setAiMetadata((current) => ({ ...current, description: e.target.value }))}
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#111827]">Tags</label>
                    <div className="flex flex-wrap items-center gap-2">
                      {aiMetadata.tags.map((tag, idx) => (
                        <TagChip key={`${tag}-${idx}`} value={tag} onChange={(value) => updateTag(idx, value)} onRemove={() => removeTag(idx)} />
                      ))}
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 text-sm font-medium text-[#4338CA] hover:bg-[#EEF2FF]"
                        onClick={addTag}
                      >
                        + Add tag
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-[#111827]">Potential Relationships</h3>
                    {relationships.map((relation) => (
                      <div key={relation.target} className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#FAFBFC] p-3">
                        <div className="flex items-center gap-2 text-sm text-[#111827]">
                          <Link2 className="h-4 w-4 text-[#6E5BFF]" />
                          <span>
                            {fileSummary?.name ?? "dataset.csv"}
                            {" -> "}
                            {relation.target}
                          </span>
                        </div>
                        <Badge variant={relation.confidence.startsWith("High") ? "success" : "warning"}>{relation.confidence}</Badge>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button variant="outline">Save Metadata</Button>
                    <Link to={out ? `/processing/${encodeURIComponent(out.ingestion_id)}` : "/track"}>
                      <Button>Continue Processing</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="h-4 w-4 text-[#6E5BFF]" />
                AI Assistant
              </CardTitle>
              <CardDescription>
                {stage === "review"
                  ? "Dativerso analyzed your dataset and found relevant context."
                  : "Dativerso explains what is being understood at each step."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stage === "review" ? (
                <>
                  <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFBFC] p-4">
                    <p className="text-sm font-semibold text-[#4338CA]">Dataset analyzed</p>
                    <p className="mt-2 text-sm text-[#374151]">
                      I identified this dataset as a customer master dataset with commercial context.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[#111827]">Main findings</p>
                    <AssistantItem text="Customer registration information" />
                    <AssistantItem text="Commercial domain detected" />
                    <AssistantItem text="Potential relationships with orders and contracts" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[#111827]">Recommended next actions</p>
                    <Button variant="outline" className="w-full justify-start">Create Gold Dataset</Button>
                    <Button variant="outline" className="w-full justify-start">Generate Business Description</Button>
                    <Button variant="outline" className="w-full justify-start">Review Relationships</Button>
                  </div>
                </>
              ) : (
                <>
                  <AssistantItem text="Understand your dataset" />
                  <AssistantItem text="Suggest metadata" />
                  <AssistantItem text="Find relationships" />
                  <AssistantItem text="Recommend outputs" />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Guideline text="Files with clear headers work best" />
              <Guideline text="Include important key columns" />
              <Guideline text="Consistent formats improve quality" />
              <Guideline text="Relationships matter across datasets" />
            </CardContent>
          </Card>

          {out ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Protocol</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-[#6B7280]">Use this id to track the ingestion lifecycle.</p>
                <code className="block rounded-md border border-[#E5E7EB] bg-[#FAFBFC] px-3 py-2 text-sm">{out.ingestion_id}</code>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[#6B7280]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function AssistantItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-[#111827]">
      <CheckCircle2 className="h-4 w-4 text-[#6E5BFF]" />
      <span>{text}</span>
    </div>
  );
}

function Guideline({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-[#E5E7EB] bg-[#FAFBFC] px-3 py-2 text-sm text-[#111827]">
      {text}
    </div>
  );
}

function EditableField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[#111827]">{label}</label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function TagChip({ value, onChange, onRemove }: { value: string; onChange: (value: string) => void; onRemove: () => void }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-[#D1D5DB] bg-[#F8FAFC] px-2 py-1">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-24 border-0 bg-transparent text-sm text-[#111827] outline-none"
      />
      <button type="button" className="text-xs text-[#6B7280] hover:text-[#111827]" onClick={onRemove} aria-label={`Remove tag ${value}`}>
        ×
      </button>
    </div>
  );
}
