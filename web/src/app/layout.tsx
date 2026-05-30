import { Outlet, useLocation } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";

const breadcrumbsByPath: Record<string, Array<{ label: string; href?: string }>> = {
  "/home": [{ label: "Home" }],
  "/dashboard": [{ label: "Home", href: "/home" }, { label: "Dashboard" }],
  "/upload": [{ label: "Home", href: "/home" }, { label: "Upload Dataset" }],
  "/track": [{ label: "Home", href: "/home" }, { label: "Processing" }],
  "/session": [{ label: "Home", href: "/home" }, { label: "Session" }],
  "/workspaces": [{ label: "Home", href: "/home" }, { label: "Workspaces" }],
  "/datasets": [{ label: "Home", href: "/home" }, { label: "Datasets" }],
  "/catalog": [{ label: "Home", href: "/home" }, { label: "Catalog" }],
  "/sources": [{ label: "Home", href: "/home" }, { label: "Sources" }],
};

export function AppLayout() {
  const location = useLocation();
  const breadcrumbs = breadcrumbsByPath[location.pathname] ?? [{ label: "Home", href: "/home" }];

  return (
    <PageShell breadcrumbs={breadcrumbs}>
      <Outlet />
    </PageShell>
  );
}
