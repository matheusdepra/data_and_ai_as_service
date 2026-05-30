import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { Timeline } from "../components/Timeline";
import { TokenBox } from "../components/TokenBox";
import { getIngestionDetail, type IngestionDetail } from "../lib/api";
import { buildTimeline, friendlyStatus } from "../lib/ingestion";
import { getJwt } from "../lib/storage";

function usePollDetail(ingestionId: string, enabled: boolean) {
  const [data, setData] = useState<IngestionDetail | null>(null);
  const [err, setErr] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function tick() {
      if (!enabled || !ingestionId) return;
      setBusy(true);
      setErr("");
      try {
        const jwt = getJwt();
        const res = await getIngestionDetail({ jwt, ingestionId });
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setErr(String(e));
      } finally {
        if (!cancelled) setBusy(false);
        timer = window.setTimeout(tick, 2500);
      }
    }

    tick();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [enabled, ingestionId]);

  return { data, err, busy };
}

export function TrackPage() {
  const [search] = useSearchParams();
  const [ingestionId, setIngestionId] = useState(() => search.get("ingestion_id") ?? "");
  const [poll, setPoll] = useState(true);

  const enabled = useMemo(() => poll && ingestionId.trim().length > 0, [poll, ingestionId]);
  const { data, err, busy } = usePollDetail(ingestionId.trim(), enabled);
  const status = data?.ingestion?.status ?? "unknown";
  const timeline = useMemo(() => buildTimeline(data), [data]);

  return (
    <div className="pageStack">
      <PageHeader
        eyebrow="Acompanhamento"
        title="Acompanhar processamento"
        description="Cole o protocolo de uma ingestao para ver o que aconteceu, o que esta acontecendo e o que fazer depois."
      />

      <div className="grid">
        <div className="panel">
          <div className="panelHeader">
            <h2>Status da ingestao</h2>
            <StatusPill status={status} />
          </div>
          <div className="panelBody">
            <div className="field">
              <label>Protocolo</label>
              <input value={ingestionId} onChange={(e) => setIngestionId(e.target.value)} placeholder="cole o protocolo aqui" />
            </div>

            <div className="btnRow">
              <button className="btn" onClick={() => setPoll((v) => !v)}>
                {poll ? "Pausar atualizacao" : "Retomar atualizacao"}
              </button>
              <span className="pill">{busy ? "Atualizando..." : poll ? "Atualizacao a cada 2.5s" : "Atualizacao pausada"}</span>
              {err ? <span className="pill pillError">{err}</span> : null}
            </div>

            {data ? (
              <>
                <div className="statusSummary">
                  <span className="sectionEyebrow">Status atual</span>
                  <h3>{friendlyStatus(status)}</h3>
                  <p>
                    Colecao: <strong>{String(data.ingestion.dataset ?? "-")}</strong> · Origem:{" "}
                    <strong>{String(data.ingestion.source ?? "-")}</strong>
                  </p>
                </div>

                <Timeline items={timeline} />

                {data.errors.length ? (
                  <div className="errorBlock">
                    <h3>Precisa de ajuste</h3>
                    <div className="list">
                      {data.errors.map((e, idx) => (
                        <div className="listItem" key={`${e.created_at}-${idx}`}>
                          <div className="listItemHeader">
                            <strong>{e.reason_code ?? "Erro identificado"}</strong>
                            <span className="pill">{e.created_at ?? ""}</span>
                          </div>
                          <p>{e.message ?? "Revise o arquivo e tente enviar novamente."}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <details className="technicalDetails">
                  <summary>Detalhes tecnicos</summary>
                  <div className="kv">
                    <div className="k">tenant_id</div>
                    <div className="v">{data.ingestion.tenant_id}</div>
                    <div className="k">ingestion_id</div>
                    <div className="v">{data.ingestion.ingestion_id}</div>
                    <div className="k">status</div>
                    <div className="v">{data.ingestion.status}</div>
                    <div className="k">landing</div>
                    <div className="v">{String(data.ingestion.landed_gcs_uri ?? "")}</div>
                    <div className="k">updated_at</div>
                    <div className="v">{String(data.ingestion.updated_at ?? "")}</div>
                  </div>

                  <div className="list detailsList">
                    {data.artifacts.map((a, idx) => (
                      <div className="listItem" key={`${a.layer}-${a.artifact_id}-${idx}`}>
                        <div className="listItemHeader">
                          <strong>{a.layer}</strong>
                          <span className="pill">{a.created_at ?? ""}</span>
                        </div>
                        <p>{a.gcs_uri ?? a.bq_table ?? ""}</p>
                      </div>
                    ))}
                  </div>
                </details>
              </>
            ) : (
              <EmptyState
                title="Nenhum protocolo consultado"
                description="Depois de enviar um arquivo, cole o protocolo aqui para acompanhar cada etapa."
              />
            )}
          </div>
        </div>

        <TokenBox />
      </div>
    </div>
  );
}
