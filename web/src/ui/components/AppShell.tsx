import { Link, NavLink, useLocation } from "react-router-dom";
import { Breadcrumbs } from "./Breadcrumbs";

const primaryNav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/upload", label: "Ingestoes" },
  { to: "/datasets", label: "Datasets" },
  { to: "/catalog", label: "Catalogo" },
  { to: "/sources", label: "Fontes" },
];

const secondaryNav = [
  { to: "/track", label: "Acompanhar" },
  { to: "/session", label: "Sessao" },
  { to: "/settings", label: "Configuracoes" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="appShell">
      <aside className="sidebar" aria-label="Navegacao principal">
        <Link to="/dashboard" className="sidebarBrand" aria-label="Dativerso Dashboard">
          <img src="/logo.jpeg" alt="" className="sidebarLogo" />
          <span>
            <strong>Dativerso</strong>
            <small>Data Platform</small>
          </span>
        </Link>

        <div className="globalSearch" role="search">
          <span>Buscar dados, colecoes, protocolos</span>
          <kbd>/</kbd>
        </div>

        <nav className="sidebarNav">
          <span className="navGroupLabel">Plataforma</span>
          {primaryNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `sideLink ${isActive ? "sideLinkActive" : ""}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <nav className="sidebarNav sidebarNavSecondary">
          <span className="navGroupLabel">Operacao</span>
          {secondaryNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `sideLink ${isActive ? "sideLinkActive" : ""}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebarFuture">
          <span className="navGroupLabel">Reservado</span>
          <p>AI Assistant, Qualidade, Linhagem, Governanca e Agentes entram aqui sem redesenhar a navegacao.</p>
        </div>
      </aside>

      <div className="workspace">
        <header className="workspaceTopbar">
          <Breadcrumbs pathname={location.pathname} />
          <Link className="topbarAction" to="/upload">
            Nova ingestao
          </Link>
        </header>
        <main className="workspaceMain">{children}</main>
      </div>
    </div>
  );
}
