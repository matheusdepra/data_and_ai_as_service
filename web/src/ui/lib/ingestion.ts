import type { IngestionDetail } from "./api";
import type { TimelineItem } from "../components/Timeline";

const ready = new Set(["silver_ready"]);
const progress = new Set(["received", "landed", "bronze_running", "bronze_ready", "silver_running"]);
const attention = new Set(["quarantined", "bronze_failed", "silver_failed"]);

export function statusTone(status: string): "good" | "running" | "bad" | "neutral" {
  if (ready.has(status)) return "good";
  if (attention.has(status)) return "bad";
  if (progress.has(status)) return "running";
  return "neutral";
}

export function friendlyStatus(status: string): string {
  const labels: Record<string, string> = {
    received: "Recebido",
    landed: "Recebido",
    bronze_running: "Preparando",
    bronze_ready: "Bruto pronto",
    silver_running: "Finalizando",
    silver_ready: "Pronto para uso",
    quarantined: "Precisa de ajuste",
    bronze_failed: "Falha na preparacao",
    silver_failed: "Falha ao finalizar",
  };

  return labels[status] ?? "Status desconhecido";
}

export function buildTimeline(detail: IngestionDetail | null): TimelineItem[] {
  const ingestion = detail?.ingestion;
  const status = ingestion?.status ?? "";
  const hasError = attention.has(status);

  return [
    {
      label: "Arquivo recebido",
      description: "Recebemos o arquivo original e registramos o protocolo de acompanhamento.",
      state: ingestion?.landed_at || progress.has(status) || ready.has(status) || hasError ? "done" : "pending",
      timestamp: ingestion?.landed_at ?? ingestion?.received_at,
    },
    {
      label: "Preparacao tecnica",
      description: hasError
        ? "Encontramos um problema antes de deixar o arquivo pronto para uso."
        : "Validamos formato, estrutura e preparamos a versao bruta rastreavel.",
      state: status === "bronze_running" ? "current" : status === "quarantined" || status === "bronze_failed" ? "error" : ingestion?.bronze_ready_at || ready.has(status) ? "done" : "pending",
      timestamp: ingestion?.bronze_ready_at ?? ingestion?.bronze_started_at,
    },
    {
      label: "Pronto para uso",
      description: "Os dados ficam disponiveis na camada Silver para consultas, dashboards e consumo por APIs.",
      state: status === "silver_running" ? "current" : status === "silver_failed" ? "error" : ready.has(status) ? "done" : "pending",
      timestamp: ingestion?.silver_ready_at ?? ingestion?.silver_started_at,
    },
  ];
}
