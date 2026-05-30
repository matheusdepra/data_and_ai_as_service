import { friendlyStatus, statusTone } from "../lib/ingestion";

export function StatusPill({ status }: { status: string }) {
  const tone = statusTone(status);
  const cls = tone === "running" ? "dotRun" : tone === "bad" ? "dotBad" : tone === "good" ? "dotGood" : "";
  return (
    <span className={`status status-${tone}`}>
      <span className={`dot ${cls}`} />
      {friendlyStatus(status)}
    </span>
  );
}
