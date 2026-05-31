import { Navigate, useSearchParams } from "react-router-dom";

export function TrackPage() {
  const [search] = useSearchParams();
  const ingestionId = (search.get("ingestion_id") ?? "").trim();

  if (ingestionId) {
    return <Navigate to={`/processing/${encodeURIComponent(ingestionId)}`} replace />;
  }
  return <Navigate to="/ingestions" replace />;
}
