import { useEffect, useState } from "react";
import { getJwt, setJwt } from "../lib/storage";

export function TokenBox() {
  const [token, setToken] = useState(() => getJwt());
  const [status, setStatus] = useState<"idle" | "saved">("idle");

  useEffect(() => {
    const t = setTimeout(() => setStatus("idle"), 1200);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <div className="panel">
      <div className="panelHeader">
        <h2>Acesso dev</h2>
        <span className="pill">Fase 0</span>
      </div>
      <div className="panelBody">
        <div className="field">
          <label>ID token operacional</label>
          <input
            placeholder="Bearer token (sem o prefixo 'Bearer ')"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
        <div className="btnRow">
          <button
            className="btn"
            onClick={() => {
              setJwt(token.trim());
              setStatus("saved");
            }}
          >
            Salvar
          </button>
          {status === "saved" ? <span className="pill">Salvo</span> : <span className="pill">localStorage</span>}
        </div>
      </div>
    </div>
  );
}
