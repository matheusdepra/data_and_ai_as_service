import { BookOpen, Database, FolderKanban, Home, Plug } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Workspaces", href: "/workspaces", icon: FolderKanban },
  { label: "Datasets", href: "/datasets", icon: Database },
  { label: "Catalog", href: "/catalog", icon: BookOpen },
  { label: "Sources", href: "/sources", icon: Plug },
];

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[280px] flex-col border-r border-[#E8EBF2] bg-white">
      <div className="flex h-16 items-center border-b border-[#E8EBF2] px-5">
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
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  isActive ? "bg-[#F3F1FF] text-[#6E5BFF]" : "text-[#667085] hover:bg-[#F8F9FC] hover:text-[#101828]",
                ].join(" ")
              }
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-[#E8EBF2] p-4">
        <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-[#F8F9FC]" type="button">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F1FF] text-sm font-semibold text-[#6E5BFF]">
            DU
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-[#101828]">Dativerso User</span>
            <span className="block truncate text-xs text-[#667085]">Acme · Dev</span>
          </span>
        </button>
      </div>
    </aside>
  );
}
