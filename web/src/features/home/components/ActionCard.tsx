import { ArrowRight, Database, FolderPlus, Library, LucideIcon } from "lucide-react";
import type { HomeAction, HomeActionKind } from "../types";

const actionIcons: Record<HomeActionKind, LucideIcon> = {
  upload: Database,
  workspace: FolderPlus,
  catalog: Library,
};

const actionStyles: Record<HomeActionKind, { iconBg: string; iconColor: string }> = {
  upload: { iconBg: "bg-[#EAF2FF]", iconColor: "text-[#2563EB]" },
  workspace: { iconBg: "bg-[#EEF2FF]", iconColor: "text-[#6E5BFF]" },
  catalog: { iconBg: "bg-[#EAFBF2]", iconColor: "text-[#16A34A]" },
};

export function ActionCard({ action }: { action: HomeAction }) {
  const Icon = actionIcons[action.kind];
  const styles = actionStyles[action.kind];

  return (
    <a
      href={action.href}
      className="group flex min-h-[96px] items-center justify-between gap-4 rounded-lg border border-[#E5E7EB] bg-white px-6 py-5 text-[#111827] shadow-sm transition hover:border-[#D0D5DD] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6E5BFF]"
    >
      <span className="flex items-center gap-4">
        <span className={["flex h-12 w-12 items-center justify-center rounded-xl", styles.iconBg, styles.iconColor].join(" ")}>
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <strong className="block text-base font-semibold leading-tight line-clamp-1">{action.title}</strong>
          <span className="mt-1 block text-sm leading-5 text-[#667085] line-clamp-2">{action.description}</span>
        </span>
      </span>
      <ArrowRight aria-hidden="true" className="h-5 w-5 text-[#98A2B3] transition group-hover:translate-x-0.5 group-hover:text-[#667085]" />
    </a>
  );
}
