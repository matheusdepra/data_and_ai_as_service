import { BookOpen, Database, FolderKanban, Home, Plug, Upload, Users, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Projects", href: "/workspaces", icon: FolderKanban },
  { label: "Datasets", href: "/datasets", icon: Database },
  { label: "Ingestions", href: "/ingestions", icon: Upload },
  { label: "Catalog", href: "/catalog", icon: BookOpen },
  { label: "Sources", href: "/sources", icon: Plug },
];

const adminItems = [
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[280px] flex-col border-r border-[#E5E7EB] bg-white">
      <div className="flex h-16 items-center border-b border-[#E5E7EB] px-5">
        <img src="/brand/main-logo-trimmed.png" alt="Dativerso" className="h-10 w-auto max-w-[172px] object-contain" />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition duration-200",
                  isActive ? "bg-[#F3F1FF] text-[#6E5BFF]" : "text-[#6B7280] hover:bg-[#FAFBFC] hover:text-[#111827]",
                ].join(" ")
              }
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-3 pb-4">
        <p className="px-3 pb-2 pt-3 text-xs font-medium text-[#98A2B3]">Administration</p>
        <nav className="space-y-1" aria-label="Administration navigation">
          {adminItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition duration-200",
                    isActive ? "bg-[#F3F1FF] text-[#6E5BFF]" : "text-[#6B7280] hover:bg-[#FAFBFC] hover:text-[#111827]",
                  ].join(" ")
                }
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-[#E5E7EB] p-4">
        <button
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-left transition hover:bg-[#FAFBFC]"
          type="button"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-[#111827]">Acme Corp</span>
            <span className="block truncate text-xs text-[#6B7280]">Production</span>
          </span>
          <span className="text-[#98A2B3]">▾</span>
        </button>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-sm font-semibold text-[#6E5BFF]">
              MA
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-[#111827]">Matheus Alves</span>
              <span className="block truncate text-xs text-[#6B7280]">matheus@acme.com</span>
            </span>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#98A2B3] transition hover:bg-[#FAFBFC] hover:text-[#111827]"
            aria-label="User menu"
          >
            ⋮
          </button>
        </div>
      </div>
    </aside>
  );
}
