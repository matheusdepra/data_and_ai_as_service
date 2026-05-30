import { Link } from "react-router-dom";

const labels: Record<string, string> = {
  dashboard: "Dashboard",
  upload: "Ingestoes",
  track: "Acompanhar",
  datasets: "Datasets",
  catalog: "Catalogo",
  sources: "Fontes",
  session: "Sessao",
  settings: "Configuracoes",
};

export function Breadcrumbs({ pathname }: { pathname: string }) {
  const parts = pathname.split("/").filter(Boolean);
  const current = parts.at(-1);

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link to="/dashboard">Dativerso</Link>
      {current ? (
        <>
          <span>/</span>
          <span aria-current="page">{labels[current] ?? current}</span>
        </>
      ) : null}
    </nav>
  );
}
