import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { getMe, type MeResponse } from "../lib/api";
import { getFirebaseAuth, isFirebaseConfigured } from "../lib/firebase";
import { clearJwt, getJwt, setJwt } from "../lib/storage";

type LoadState = "idle" | "loading" | "ready" | "error";

export function SessionPage() {
  const [state, setState] = useState<LoadState>("idle");
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [token, setTokenState] = useState(() => getJwt());
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState("");
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) return;
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (!user) {
        setMe(null);
        return;
      }
      setState("loading");
      setError("");
      try {
        const nextToken = await user.getIdToken(true);
        setJwt(nextToken);
        setTokenState(nextToken);
        const meResponse = await getMe({ jwt: nextToken });
        setMe(meResponse);
        setState("ready");
      } catch (err) {
        setMe(null);
        setState("error");
        setError(err instanceof Error ? err.message : "Nao foi possivel validar a sessao.");
      }
    });
  }, [configured]);

  async function copyToken() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
  }

  async function logout() {
    if (!configured) return;
    const auth = getFirebaseAuth();
    await signOut(auth);
    clearJwt();
    setTokenState("");
    setMe(null);
  }

  return (
    <div className="authLayout authLayoutWide">
      <section className="authPanel authHero">
        <div className="sectionEyebrow">Sessao ativa</div>
        <h2 className="pageTitle">Seu acesso esta pronto para uso.</h2>
        <p className="pageLead">
          Esta tela existe para o MVP operacional: confirmar autenticacao, validar membership no tenant e disponibilizar o token para testes controlados.
        </p>

        <div className="supportGrid">
          <div className="supportCard">
            <strong>Firebase</strong>
            <p>{authUser?.email ?? "Nenhum usuario autenticado no navegador."}</p>
          </div>
          <div className="supportCard">
            <strong>Status</strong>
            <p>
              {state === "loading"
                ? "Validando sessao e tenant..."
                : state === "ready"
                  ? "Membership resolvido."
                  : state === "error"
                    ? "Sessao autenticada, mas ainda nao validada no backend."
                    : "Aguardando autenticacao."}
            </p>
          </div>
        </div>

        {error ? <div className="inlineNotice inlineNoticeError">{error}</div> : null}

        <div className="kv authKv">
          <div className="k">email</div>
          <div className="v">{authUser?.email ?? "-"}</div>
          <div className="k">tenant_id</div>
          <div className="v">{me?.tenant_id ?? "-"}</div>
          <div className="k">role</div>
          <div className="v">{me?.role ?? "-"}</div>
          <div className="k">sub</div>
          <div className="v">{me?.sub ?? authUser?.uid ?? "-"}</div>
        </div>

        <div className="btnRow">
          <button className="btn btnPrimary" onClick={copyToken} disabled={!token}>
            Copiar ID token
          </button>
          <Link className="btn" to="/upload">
            Ir para upload
          </Link>
          <button className="btn btnGhost" onClick={logout} disabled={!authUser}>
            Encerrar sessao
          </button>
        </div>
      </section>

      <aside className="authPanel authAside">
        <div className="sectionEyebrow">Uso operacional</div>
        <div className="field">
          <label>ID token atual</label>
          <textarea
            className="tokenArea"
            value={token}
            readOnly
            placeholder="Depois do login, o token aparece aqui para uso temporario no Postman ou em testes manuais."
          />
        </div>
        <div className="authCallout">
          <strong>Proximo passo</strong>
          <p>
            Com `tenant_id` e `role` resolvidos, o fluxo natural e seguir para <code>/v1/files</code> e depois acompanhar a ingestao.
          </p>
        </div>
      </aside>
    </div>
  );
}
