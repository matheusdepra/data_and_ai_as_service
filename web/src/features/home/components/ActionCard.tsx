import { Database, FolderPlus, Library, LucideIcon } from "lucide-react";
import type { HomeAction, HomeActionKind } from "../types";

const actionIcons: Record<HomeActionKind, LucideIcon> = {
  upload: Database,
  workspace: FolderPlus,
  catalog: Library,
};

export function ActionCard({ action }: { action: HomeAction }) {
  const Icon = actionIcons[action.kind];

  return (
    <a
      href={action.href}
      className="group flex min-h-44 flex-col justify-between rounded-lg border border-slate-200 bg-white p-6 text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <span className="mt-8">
        <strong className="block text-lg font-semibold leading-tight">{action.title}</strong>
        <span className="mt-2 block text-sm leading-6 text-slate-600">{action.description}</span>
      </span>
    </a>
  );
}
