import { useEffect, useMemo, useState } from "react";
import { getIngestionDetail, type IngestionDetail } from "../lib/api";
import { getJwt } from "../lib/storage";
import { StatusPill } from "../components/StatusPill";
import { TokenBox } from "../components/TokenBox";

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
  const [ingestionId, setIngestionId] = useState("");
  const [poll, setPoll] = useState(true);

  const enabled = useMemo(() => poll && ingestionId.trim().length > 0, [poll, ingestionId]);
  const { data, err, busy } = usePollDetail(ingestionId.trim(), enabled);
  const status = data?.ingestion?.status ?? "unknown";

  return (
    <div className="grid">
      <div className="card">
        <div className="cardHeader">
          <h2>Acompanhar</h2>
          <StatusPill status={status} />
        </div>
        <div className="cardBody">
          <div className="field">
            <label>ingestion_id</label>
            <input value={ingestionId} onChange={(e) => setIngestionId(e.target.value)} placeholder="cole o ingestion_id aqui" />
          </div>

          <div className="btnRow">
            <button className="btn" onClick={() => setPoll((v) => !v)}>
              {poll ? "Pausar" : "Retomar"} polling
            </button>
            <span className="pill">{busy ? "atualizando..." : poll ? "polling 2.5s" : "parado"}</span>
            {err ? <span className="pill">{err}</span> : null}
          </div>

          {data ? (
            <>
              <div className="kv">
                <div className="k">tenant_id</div>
                <div className="v">{data.ingestion.tenant_id}</div>
                <div className="k">dataset</div>
                <div className="v">{String(data.ingestion.dataset ?? "")}</div>
                <div className="k">source</div>
                <div className="v">{String(data.ingestion.source ?? "")}</div>
                <div className="k">landing</div>
                <div className="v">{String(data.ingestion.landed_gcs_uri ?? "")}</div>
                <div className="k">updated_at</div>
                <div className="v">{String(data.ingestion.updated_at ?? "")}</div>
              </div>

              <div style={{ marginTop: 14 }}>
                <div className="list">
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
              </div>

              {data.errors.length ? (
                <div style={{ marginTop: 14 }}>
                  <div className="list">
                    {data.errors.map((e, idx) => (
                      <div className="listItem" key={`${e.created_at}-${idx}`}>
                        <div className="listItemHeader">
                          <strong>{e.reason_code ?? "error"}</strong>
                          <span className="pill">{e.created_at ?? ""}</span>
                        </div>
                        <p>{e.message ?? ""}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <TokenBox />
    </div>
  );
}

