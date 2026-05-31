import { Outlet, useLocation } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";

const breadcrumbsByPath: Record<string, Array<{ label: string; href?: string }>> = {
  "/home": [{ label: "Home" }],
  "/dashboard": [{ label: "Home", href: "/home" }, { label: "Dashboard" }],
  "/upload": [{ label: "Home", href: "/home" }, { label: "Upload Dataset" }],
  "/ingestions": [{ label: "Home", href: "/home" }, { label: "Ingestions" }],
  "/track": [{ label: "Home", href: "/home" }, { label: "Processing" }],
  "/session": [{ label: "Home", href: "/home" }, { label: "Session" }],
  "/workspaces": [{ label: "Home", href: "/home" }, { label: "Workspaces" }],
  "/datasets": [{ label: "Home", href: "/home" }, { label: "Datasets" }],
  "/catalog": [{ label: "Home", href: "/home" }, { label: "Catalog" }],
  "/sources": [{ label: "Home", href: "/home" }, { label: "Sources" }],
  "/admin/users": [{ label: "Home", href: "/home" }, { label: "Administration" }, { label: "Users" }],
  "/admin/settings": [{ label: "Home", href: "/home" }, { label: "Administration" }, { label: "Settings" }],
};

export function AppLayout() {
  const location = useLocation();
  const breadcrumbs =
    location.pathname.startsWith("/processing/")
      ? [{ label: "Home", href: "/home" }, { label: "Processing" }]
      : location.pathname.startsWith("/datasets/") && location.pathname.endsWith("/overview")
        ? [{ label: "Home", href: "/home" }, { label: "Ingestions", href: "/ingestions" }, { label: "Dataset Overview" }]
      : (breadcrumbsByPath[location.pathname] ?? [{ label: "Home", href: "/home" }]);

  return (
    <PageShell breadcrumbs={breadcrumbs}>
      <Outlet />
    </PageShell>
  );
}
