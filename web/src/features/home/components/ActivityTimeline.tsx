import type { ActivityEvent } from "../types";

export function ActivityTimeline({ items }: { items: ActivityEvent[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
        No recent activity yet.
      </div>
    );
  }

  return (
    <ol className="space-y-0" aria-label="Recent Activity">
      {items.map((item, index) => (
        <li key={item.id} className="grid grid-cols-[1.25rem_1fr] gap-3">
          <span className="relative flex justify-center">
            <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-cyan-600" />
            {index < items.length - 1 ? <span className="absolute top-5 h-full w-px bg-slate-200" /> : null}
          </span>
          <span className="pb-5">
            <strong className="block text-sm font-semibold text-slate-950">{item.title}</strong>
            <span className="mt-1 block text-sm text-slate-700">{item.subject}</span>
            <span className="mt-1 block text-xs text-slate-500">{item.happenedAt}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
