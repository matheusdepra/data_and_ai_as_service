import { PageShell } from "./PageShell";
import type { BreadcrumbItem } from "./Breadcrumbs";

type AppShellProps = {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
  contentClassName?: string;
};

export function AppShell(props: AppShellProps) {
  return <PageShell {...props} />;
}
