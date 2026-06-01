import { cn } from "../../lib/utils";
import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";

type PageHeaderProps = {
  title?: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, description, breadcrumbs, actions, className }: PageHeaderProps) {
  const hasHeading = Boolean(title || description);

  return (
    <header className={cn("flex flex-col gap-5", className)}>
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        {hasHeading ? (
          <div className="max-w-3xl">
            {title ? <h1 className="text-4xl font-bold leading-[1.3] tracking-normal text-[#111827]">{title}</h1> : null}
            {description ? <p className="mt-2 text-base leading-relaxed text-[#6B7280]">{description}</p> : null}
          </div>
        ) : null}
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
