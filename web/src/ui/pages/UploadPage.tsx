import { useState } from "react";
import { uploadFile, type UploadResponse } from "../lib/api";
import { getJwt } from "../lib/storage";
import { TokenBox } from "../components/TokenBox";

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("upload");
  const [dataset, setDataset] = useState("default");
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
    <div className="grid">
      <div className="card">
        <div className="cardHeader">
          <h2>Upload</h2>
          {out ? <span className="pill">ingestion_id gerado</span> : <span className="pill">CSV / JSON / Parquet</span>}
        </div>
        <div className="cardBody">
          <div className="row">
            <div className="field">
              <label>Source</label>
              <input value={source} onChange={(e) => setSource(e.target.value)} />
            </div>
            <div className="field">
              <label>Dataset</label>
              <input value={dataset} onChange={(e) => setDataset(e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Arquivo</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.item(0) ?? null)}
              accept=".csv,.json,.parquet"
            />
          </div>

          <div className="btnRow">
            <button className="btn btnPrimary" disabled={!file || busy} onClick={onSubmit}>
              {busy ? "Enviando..." : "Enviar"}
            </button>
            {err ? <span className="pill">{err}</span> : null}
          </div>

          {out ? (
            <div className="kv">
              <div className="k">tenant_id</div>
              <div className="v">{out.tenant_id}</div>
              <div className="k">ingestion_id</div>
              <div className="v">{out.ingestion_id}</div>
              <div className="k">status</div>
              <div className="v">{out.status}</div>
              <div className="k">landing</div>
              <div className="v">{out.gcs_uri_landing}</div>
            </div>
          ) : null}
        </div>
      </div>

      <TokenBox />
    </div>
  );
}

