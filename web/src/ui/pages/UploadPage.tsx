import { useState } from "react";
import { Link } from "react-router-dom";
import { uploadFile, type UploadResponse } from "../lib/api";
import { getJwt } from "../lib/storage";
import { TokenBox } from "../components/TokenBox";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { StatusPill } from "../components/StatusPill";

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("upload");
  const [dataset, setDataset] = useState("faturamento");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<UploadResponse | null>(null);
  const [err, setErr] = useState<string>("");

  async function onSubmit() {
    setErr("");
    setOut(null);
    if (!file) return;
    setBusy(true);
    try {
      const jwt = getJwt();
      const res = await uploadFile({ jwt, file, source, dataset });
      setOut(res);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pageStack">
      <PageHeader
        eyebrow="Ingestoes"
        title="Enviar arquivo"
        description="Suba um CSV, JSON ou Parquet para transformar uma colecao recorrente em dados prontos para uso."
        actions={
          <Link className="btn" to="/track">
            Acompanhar protocolo
          </Link>
        }
      />

      <div className="legacyGrid">
        <div className="panel">
          <div className="panelHeader">
            <h2>Nova ingestao</h2>
            {out ? <StatusPill status={out.status} /> : <span className="pill">CSV / JSON / Parquet</span>}
          </div>
          <div className="panelBody">
            <div className="wizardSteps" aria-label="Etapas do upload">
              <span className="wizardStep wizardStepActive">Colecao</span>
              <span className={`wizardStep ${file ? "wizardStepActive" : ""}`}>Arquivo</span>
              <span className={`wizardStep ${out ? "wizardStepActive" : ""}`}>Protocolo</span>
            </div>

            <div className="row">
              <div className="field">
                <label>Colecao</label>
                <input value={dataset} onChange={(e) => setDataset(e.target.value)} placeholder="ex.: faturamento" />
                <small>Na API, este valor ainda e enviado como `dataset`.</small>
              </div>
              <div className="field">
                <label>Origem</label>
                <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="ex.: upload" />
              </div>
            </div>

            <div className="field">
              <label>Arquivo</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.item(0) ?? null)}
                accept=".csv,.json,.parquet"
              />
              <small>Formatos aceitos no MVP: CSV, JSON e Parquet.</small>
            </div>

            {file ? (
              <div className="filePreview">
                <div>
                  <strong>{file.name}</strong>
                  <span>{Math.max(file.size / 1024 / 1024, 0.01).toFixed(2)} MB</span>
                </div>
                <span className="pill">Pronto para enviar</span>
              </div>
            ) : (
              <EmptyState
                title="Escolha um arquivo para iniciar"
                description="Depois do envio, a plataforma retorna um protocolo para acompanhar o processamento."
              />
            )}

            <div className="btnRow">
              <button className="btn btnPrimary" disabled={!file || busy} onClick={onSubmit}>
                {busy ? "Enviando..." : "Enviar arquivo"}
              </button>
              {err ? <span className="pill pillError">{err}</span> : null}
            </div>

            {out ? (
              <div className="resultPanel">
                <span className="sectionEyebrow">Recebemos seu arquivo</span>
                <h3>Protocolo criado</h3>
                <div className="protocolBox">{out.ingestion_id}</div>
                <p>Use este protocolo para acompanhar a preparacao ate a camada Pronto para uso.</p>
                <div className="btnRow">
                  <Link className="btn btnPrimary" to={`/track?ingestion_id=${encodeURIComponent(out.ingestion_id)}`}>
                    Acompanhar processamento
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <TokenBox />
      </div>
    </div>
  );
}
