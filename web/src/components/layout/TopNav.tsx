import { Bell, Search, UserCircle } from "lucide-react";
import { Breadcrumbs } from "./Breadcrumbs";

export function TopNav({ breadcrumbs }: { breadcrumbs: Array<{ label: string; href?: string }> }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-[#E8EBF2] bg-white/95 px-6 backdrop-blur">
      <div className="w-64 shrink-0">
        <Breadcrumbs items={breadcrumbs} />
      </div>

      <label className="relative max-w-2xl flex-1">
        <span className="sr-only">Search</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
        <input
          className="h-10 w-full rounded-lg border border-[#E8EBF2] bg-[#F8F9FC] pl-9 pr-3 text-sm text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-[#6E5BFF] focus:bg-white focus:ring-4 focus:ring-[#6E5BFF]/10"
          placeholder="Search datasets, workspaces or ask Dativerso..."
          type="search"
        />
      </label>

      <div className="flex items-center gap-2">
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E8EBF2] bg-white text-[#667085] transition hover:bg-[#F8F9FC] hover:text-[#101828]"
          type="button"
          aria-label="Notifications"
        >
          <Bell aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E8EBF2] bg-white text-[#667085] transition hover:bg-[#F8F9FC] hover:text-[#101828]"
          type="button"
          aria-label="Profile"
        >
          <UserCircle aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
