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
    <div className={cn("min-h-screen bg-[#FAFBFC] text-[#111827]", className)}>
      <AppSidebar />
      <div className="min-w-0 lg:pl-[280px]">
        <TopNav breadcrumbs={breadcrumbs ?? [{ label: "Home", href: "/home" }]} />
        <main className={cn("mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-8 lg:py-8", contentClassName)}>{children}</main>
      </div>
    </div>
  );
}
