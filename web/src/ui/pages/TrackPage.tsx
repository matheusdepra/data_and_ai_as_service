import { Link, Navigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "../components/EmptyState";

export function TrackPage() {
  const [search] = useSearchParams();
  const ingestionId = (search.get("ingestion_id") ?? "").trim();

  if (ingestionId) {
    return <Navigate to={`/processing/${encodeURIComponent(ingestionId)}`} replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Processing"
        description="Use the Upload review screen to continue to processing automatically."
        actions={
          <Link to="/upload">
            <Button>Go to Upload</Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="p-6">
          <EmptyState
            title="No ingestion selected"
            description="This page remains as a temporary alias. Open processing using /processing/:ingestionId."
          />
        </CardContent>
      </Card>
    </div>
  );
}
