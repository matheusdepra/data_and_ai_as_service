import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { ArrowRight, Eye, FileUp, RefreshCw } from "lucide-react";

import { DataTable } from "@/components/data/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getIngestions, type IngestionListItem } from "../lib/api";
import { friendlyStatus, statusTone } from "../lib/ingestion";
import { getJwt } from "../lib/storage";


export function IngestionsPage() {
  const [items, setItems] = useState<IngestionListItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setBusy(true);
      setErr("");
      try {
        const jwt = getJwt();
        const res = await getIngestions({ jwt, limit: 50 });
        if (!cancelled) setItems(res.items);
      } catch (error) {
        if (!cancelled) setErr(String(error));
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = useMemo<ColumnDef<IngestionListItem>[]>(
    () => [
      {
        accessorKey: "collection_slug",
        header: "Collection",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div>
              <p className="font-semibold text-[#111827]">{humanize(item.collection_slug || item.dataset || "default")}</p>
              <p className="text-xs text-[#6B7280]">{item.file?.name || "Uploaded file"}</p>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusToneBadge status={row.original.status} />,
      },
      {
        id: "overview",
        header: "Overview",
        cell: ({ row }) => {
          const status = row.original.overview_status;
          if (!status) return <span className="text-sm text-[#9CA3AF]">Not started</span>;
          return <Badge variant={status === "ready" ? "success" : status === "failed" ? "warning" : "info"}>{status}</Badge>;
        },
      },
      {
        accessorKey: "updated_at",
        header: "Updated",
        cell: ({ row }) => formatDateTime(row.original.updated_at),
      },
      {
        id: "action",
        header: "",
        cell: ({ row }) => {
          const href = destinationForIngestion(row.original);
          return (
            <Button asChild size="sm">
              <Link to={href}>
                {row.original.status === "silver_ready" ? <Eye className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                Open
              </Link>
            </Button>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ingestions"
        description="Resume the exact point where each dataset ingestion stopped, from processing to overview."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.location.reload()} disabled={busy}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button asChild>
              <Link to="/upload">
                <FileUp className="h-4 w-4" />
                New ingestion
              </Link>
            </Button>
          </div>
        }
      />

      {err ? (
        <EmptyState
          title="Could not load ingestions"
          description={err}
          actionLabel="Try again"
          onAction={() => window.location.reload()}
        />
      ) : items.length === 0 && !busy ? (
        <EmptyState
          title="No ingestions yet"
          description="Your uploaded datasets will appear here so you can reopen processing or jump directly to the overview."
          actionLabel="Upload dataset"
          onAction={() => {
            window.location.href = "/upload";
          }}
        />
      ) : (
        <DataTable
          title="Recent ingestions"
          description={busy ? "Loading latest activity..." : "Open an ingestion to continue processing or review the dataset overview."}
          columns={columns}
          data={items}
          searchPlaceholder="Search by collection, file or status"
        />
      )}
    </div>
  );
}


function destinationForIngestion(item: IngestionListItem): string {
  if (item.status === "silver_ready") {
    return `/datasets/${encodeURIComponent(item.ingestion_id)}/overview`;
  }
  return `/processing/${encodeURIComponent(item.ingestion_id)}`;
}


function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}


function humanize(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}


function StatusToneBadge({ status }: { status: string }) {
  const tone = statusTone(status);
  const variant = tone === "good" ? "success" : tone === "bad" ? "warning" : tone === "running" ? "info" : "outline";
  return <Badge variant={variant}>{friendlyStatus(status)}</Badge>;
}
