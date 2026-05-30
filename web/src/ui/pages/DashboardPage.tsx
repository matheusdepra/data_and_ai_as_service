import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";

export function DashboardPage() {
  return (
    <div className="pageStack">
      <PageHeader
        eyebrow="Operacao"
        title="O que precisa da sua atencao"
        description="Acompanhe ingestao de arquivos, protocolos em andamento e pontos que precisam de ajuste."
        actions={
          <>
            <Link className="btn" to="/track">
              Acompanhar protocolo
            </Link>
            <Link className="btn btnPrimary" to="/upload">
              Nova ingestao
            </Link>
          </>
        }
      />

      <section className="metricGrid" aria-label="Resumo operacional">
        <div className="metricCard">
          <span>Colecoes</span>
          <strong>-</strong>
          <p>Historico por colecao depende do endpoint de listagem documentado como P1.</p>
        </div>
        <div className="metricCard">
          <span>Em processamento</span>
          <strong>-</strong>
          <p>Use um protocolo para acompanhar o processamento em tempo real.</p>
        </div>
        <div className="metricCard metricCardAttention">
          <span>Pendencias</span>
          <strong>-</strong>
          <p>Falhas e quarentenas aparecem ao consultar uma ingestao.</p>
        </div>
        <div className="metricCard">
          <span>Qualidade</span>
          <strong>Futuro</strong>
          <p>Indicadores de qualidade entram quando as metricas estiverem expostas pela API.</p>
        </div>
      </section>

      <section className="contentGrid">
        <div className="panel">
          <div className="panelHeader">
            <h2>Atividade recente</h2>
            <Link className="textLink" to="/track">
              Consultar protocolo
            </Link>
          </div>
          <EmptyState
            title="Sem historico agregado ainda"
            description="O MVP atual consulta uma ingestao por protocolo. A listagem de ingestoes recentes esta documentada como dependencia futura do backend."
          />
        </div>

        <aside className="panel aiPanel">
          <div className="panelHeader">
            <h2>Insights assistidos</h2>
            <span className="pill">Reservado</span>
          </div>
          <p>
            Este espaco foi preparado para resumos de dataset, explicacoes de linhagem, sugestoes de metadados e recomendacoes de qualidade quando os agentes forem habilitados.
          </p>
          <div className="suggestionList">
            <span>Descricao automatica da colecao</span>
            <span>Campos com possivel problema de padronizacao</span>
            <span>Proximas acoes apos uma falha</span>
          </div>
        </aside>
      </section>
    </div>
  );
}
