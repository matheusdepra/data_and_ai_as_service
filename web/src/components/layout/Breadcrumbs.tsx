import { Link } from "react-router-dom";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[#667085]">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-2">
            {item.href && !isLast ? (
              <Link className="transition hover:text-[#101828]" to={item.href}>
                {item.label}
              </Link>
            ) : (
              <span aria-current={isLast ? "page" : undefined} className={isLast ? "text-[#101828]" : undefined}>
                {item.label}
              </span>
            )}
            {!isLast ? <span className="text-[#98A2B3]">/</span> : null}
          </span>
        );
      })}
    </nav>
  );
}
