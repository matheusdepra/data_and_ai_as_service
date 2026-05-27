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
    <div className="card">
      <div className="cardHeader">
        <h2>Token</h2>
        <span className="pill">localStorage</span>
      </div>
      <div className="cardBody">
        <div className="field">
          <label>JWT (dev)</label>
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
          {status === "saved" ? <span className="pill">ok</span> : <span className="pill">cole um token e salve</span>}
        </div>
      </div>
    </div>
  );
}

