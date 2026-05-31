import { Bell, Search } from "lucide-react";
import { Breadcrumbs } from "./Breadcrumbs";

export function TopNav({ breadcrumbs }: { breadcrumbs: Array<{ label: string; href?: string }> }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-[#E5E7EB] bg-white/95 px-6 backdrop-blur">
      <div className="min-w-0 shrink-0">
        <Breadcrumbs items={breadcrumbs} />
      </div>

      <div className="flex-1" />

      <label className="relative w-full max-w-[520px]">
        <span className="sr-only">Search</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
        <input
          className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-[#FAFBFC] pl-9 pr-3 text-sm text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#6E5BFF] focus:bg-white focus:ring-4 focus:ring-[#6E5BFF]/10 sm:pr-14"
          placeholder="Search..."
          type="search"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-[#E5E7EB] bg-white px-2 py-0.5 text-[11px] font-medium text-[#6B7280] sm:inline-flex">
          ⌘ K
        </kbd>
      </label>

      <div className="flex items-center gap-2">
        <button
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:bg-[#FAFBFC] hover:text-[#111827]"
          type="button"
          aria-label="Notifications"
        >
          <Bell aria-hidden="true" className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#6E5BFF]" aria-hidden="true" />
        </button>
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:bg-[#FAFBFC] hover:text-[#111827]"
          type="button"
          aria-label="Profile"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF2FF] text-xs font-semibold text-[#6E5BFF]">
            MA
          </span>
        </button>
      </div>
    </header>
  );
}
