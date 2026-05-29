import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendSignInLinkToEmail } from "firebase/auth";
import { continueUrl, getFirebaseAuth, isFirebaseConfigured } from "../lib/firebase";
import { setPendingEmail } from "../lib/storage";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function LoginPage() {
  const navigate = useNavigate();
  const configured = isFirebaseConfigured();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const emailValue = useMemo(() => normalizeEmail(email), [email]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!configured) {
      setError("Firebase Web Auth ainda nao foi configurado neste frontend.");
      return;
    }
    if (!emailValue) {
      setError("Informe um e-mail valido para continuar.");
      return;
    }

    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      await sendSignInLinkToEmail(auth, emailValue, {
        url: continueUrl(),
        handleCodeInApp: true,
      });
      setPendingEmail(emailValue);
      navigate(`/login/check-email?email=${encodeURIComponent(emailValue)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel enviar o link de acesso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authLayout">
      <section className="authPanel authHero">
        <div className="sectionEyebrow">Entrada segura</div>
        <h2 className="pageTitle">Acesse a Dativerso sem senha.</h2>
        <p className="pageLead">
          Digite seu e-mail de trabalho. Enviamos um link de acesso temporario para voce entrar no ambiente da sua empresa.
        </p>

        <form onSubmit={onSubmit} className="authForm">
          <div className="field fieldLarge">
            <label>E-mail corporativo</label>
            <input
              type="email"
              placeholder="voce@empresa.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="btnRow">
            <button className="btn btnPrimary btnLarge" disabled={busy}>
              {busy ? "Enviando link..." : "Receber link de acesso"}
            </button>
            <Link className="btn btnGhost" to="/session">
              Ja entrei, revisar sessao
            </Link>
          </div>

          {error ? <div className="inlineNotice inlineNoticeError">{error}</div> : null}
          {!configured ? (
            <div className="inlineNotice">
              Configure `VITE_FIREBASE_*` antes de usar o fluxo real de login.
            </div>
          ) : null}
        </form>

        <div className="trustBar">
          <span>Sem senha para memorizar</span>
          <span>Convites por tenant</span>
          <span>Session token renovado pelo Firebase</span>
        </div>
      </section>

      <aside className="authPanel authAside">
        <div className="sectionEyebrow">Como funciona</div>
        <ol className="stepList">
          <li>
            <strong>Voce informa o e-mail</strong>
            <p>Use o mesmo e-mail que recebeu o invite do SaaS.</p>
          </li>
          <li>
            <strong>Recebe um link temporario</strong>
            <p>O link expira e so funciona para o endereco que iniciou a sessao.</p>
          </li>
          <li>
            <strong>Entramos no tenant certo</strong>
            <p>Ao concluir o login, o backend valida membership e papel no Firestore.</p>
          </li>
        </ol>

        <div className="authCallout">
          <strong>Primeiro acesso</strong>
          <p>
            Se voce foi convidado e ainda nao possui membership, a primeira chamada ao <code>/v1/me</code> conclui a associacao automaticamente.
          </p>
        </div>
      </aside>
    </div>
  );
}
