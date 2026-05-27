const GOOD = new Set(["silver_ready", "bronze_ready", "landed"]);
const BAD = new Set(["bronze_failed", "silver_failed", "quarantined"]);
const RUN = new Set(["bronze_running", "silver_running"]);

export function StatusPill({ status }: { status: string }) {
  const cls = RUN.has(status) ? "dotWarn" : BAD.has(status) ? "dotBad" : GOOD.has(status) ? "dotGood" : "";
  return (
    <span className="status">
      <span className={`dot ${cls}`} />
      {status}
    </span>
  );
}

