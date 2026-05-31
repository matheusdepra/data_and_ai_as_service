import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";

const content = {
  projects: {
    eyebrow: "Work",
    title: "Projects",
    description: "AI-guided workspaces where you build datasets, metrics and analytical assets.",
    emptyTitle: "Projects are coming next",
    emptyDescription: "The MVP still focuses on uploads and ingestion tracking. This page is reserved for listing and creating projects.",
  },
  datasets: {
    eyebrow: "Dados",
    title: "Datasets",
    description: "Entidades de dados prontas para receber schema, amostra, estatisticas, qualidade, contexto de negocio e linhagem.",
    emptyTitle: "Dataset como entidade principal",
    emptyDescription: "O MVP ainda nao expoe listagem de datasets. A tela ja reserva a hierarquia para Overview, Schema, Sample Data, Estatisticas, Qualidade e Linhagem.",
  },
  catalog: {
    eyebrow: "Governanca",
    title: "Catalogo",
    description: "Catalogo de colecoes, metadados e contexto de negocio para consumo humano, APIs e agentes.",
    emptyTitle: "Catalogo preparado para metadados",
    emptyDescription: "Quando a API de catalogo existir, esta area pode receber descricoes, owners, tags, contratos e contexto gerado por IA.",
  },
  sources: {
    eyebrow: "Conectividade",
    title: "Fontes de dados",
    description: "Uploads existem no MVP. Conectores de bancos, APIs, SAP e agentes locais ficam fora do P0.",
    emptyTitle: "Conectores ainda fora do MVP",
    emptyDescription: "Use o fluxo de ingestao por arquivo por enquanto. Esta pagina fica reservada para conectar fontes recorrentes nas proximas fases.",
  },
  settings: {
    eyebrow: "Workspace",
    title: "Configuracoes",
    description: "Identidade, membros, convites, modulos contratados e preferencias do tenant entram nesta area.",
    emptyTitle: "Administracao em construcao",
    emptyDescription: "A resolucao de membership ja acontece via /v1/me. Convites e gestao de usuarios dependem das rotas administrativas da Identity API.",
  },
  users: {
    eyebrow: "Administration",
    title: "Users",
    description: "Invite, manage roles and control access for members inside the tenant.",
    emptyTitle: "User management is not wired yet",
    emptyDescription: "This surface will connect to the Identity API once invites and role management are ready.",
  },
};

export function PlaceholderPage({ kind }: { kind: keyof typeof content }) {
  const page = content[kind];

  return (
    <div className="pageStack">
      <PageHeader eyebrow={page.eyebrow} title={page.title} description={page.description} />
      <div className="panel">
        <EmptyState
          title={page.emptyTitle}
          description={page.emptyDescription}
          action={
            <Link className="btn btnPrimary" to="/upload">
              Nova ingestao
            </Link>
          }
        />
      </div>
    </div>
  );
}
