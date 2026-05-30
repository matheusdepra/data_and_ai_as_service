import { AppSidebar } from "./AppSidebar";
import type { BreadcrumbItem } from "./Breadcrumbs";
import { TopNav } from "./TopNav";
import { cn } from "../../lib/utils";

type PageShellProps = {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
  contentClassName?: string;
};

export function PageShell({ children, breadcrumbs, className, contentClassName }: PageShellProps) {
  return (
    <div className={cn("min-h-screen bg-slate-50 text-slate-950", className)}>
      <AppSidebar />
      <div className="min-w-0 lg:pl-[280px]">
        <TopNav breadcrumbs={breadcrumbs ?? [{ label: "Home", href: "/home" }]} />
        <main className={cn("mx-auto w-full max-w-7xl px-4 py-6 lg:px-6", contentClassName)}>{children}</main>
      </div>
    </div>
  );
}
