import type { ActivityEvent } from "../types";

const eventStyles: Record<
  string,
  { dot: string; iconBg: string; icon: string; label: string }
> = {
  "Dataset uploaded": { dot: "bg-[#6E5BFF]", iconBg: "bg-[#EAF2FF]", icon: "text-[#2563EB]", label: "↑" },
  "Dataset processed": { dot: "bg-[#12B76A]", iconBg: "bg-[#ECFDF3]", icon: "text-[#12B76A]", label: "✓" },
  "Dataset ready": { dot: "bg-[#5EC9FF]", iconBg: "bg-[#EEF9FF]", icon: "text-[#0284C7]", label: "≋" },
  "Quality issue detected": { dot: "bg-[#F79009]", iconBg: "bg-[#FFFAEB]", icon: "text-[#B54708]", label: "★" },
};

export function ActivityTimeline({ items }: { items: ActivityEvent[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#D0D5DD] bg-[#FAFBFC] p-5 text-sm text-[#667085]">
        No recent activity yet.
      </div>
    );
  }

  return (
    <ol className="space-y-0" aria-label="Recent Activity">
      {items.map((item, index) => (
        <li key={item.id} className="grid grid-cols-[1.5rem_1fr] gap-3">
          <span className="relative flex justify-center">
            <span className={["mt-1.5 h-2.5 w-2.5 rounded-full", (eventStyles[item.title] ?? { dot: "bg-[#98A2B3]" }).dot].join(" ")} />
            {index < items.length - 1 ? <span className="absolute top-5 h-full w-px bg-[#EAECF0]" /> : null}
          </span>
          <div className="flex items-start justify-between gap-4 pb-5">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={[
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
                  (eventStyles[item.title] ?? { iconBg: "bg-[#F2F4F7]", icon: "text-[#667085]", label: "•" }).iconBg,
                  (eventStyles[item.title] ?? { iconBg: "bg-[#F2F4F7]", icon: "text-[#667085]", label: "•" }).icon,
                ].join(" ")}
                aria-hidden="true"
              >
                {(eventStyles[item.title] ?? { label: "•" }).label}
              </span>
              <div className="min-w-0">
                <strong className="block truncate text-sm font-semibold text-[#101828]">{item.title}</strong>
                <span className="mt-1 block truncate text-sm text-[#667085]">{item.subject}</span>
              </div>
            </div>
            <span className="shrink-0 text-xs font-medium text-[#98A2B3]">{item.happenedAt}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
