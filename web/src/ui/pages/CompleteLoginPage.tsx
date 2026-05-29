import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "../lib/firebase";
import { clearPendingEmail, getPendingEmail, setJwt } from "../lib/storage";

export function CompleteLoginPage() {
  const navigate = useNavigate();
  const configured = isFirebaseConfigured();
  const [email, setEmail] = useState(() => getPendingEmail());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [autoAttempted, setAutoAttempted] = useState(false);

  const isMagicLink = useMemo(() => {
    if (!configured) return false;
    return isSignInWithEmailLink(getFirebaseAuth(), window.location.href);
  }, [configured]);

  async function finishLogin(overrideEmail?: string) {
    const emailValue = (overrideEmail ?? email).trim().toLowerCase();
    setBusy(true);
    setError("");
    try {
      if (!configured) {
        throw new Error("Firebase Web Auth ainda nao foi configurado neste frontend.");
      }
      if (!isMagicLink) {
        throw new Error("Este link nao parece ser um link valido de login por e-mail.");
      }
      if (!emailValue) {
        throw new Error("Confirme o e-mail usado no inicio da sessao.");
      }

      const auth = getFirebaseAuth();
      const result = await signInWithEmailLink(auth, emailValue, window.location.href);
      const idToken = await result.user.getIdToken(true);
      setJwt(idToken);
      clearPendingEmail();
      navigate("/session", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel concluir o login.");
    } finally {
      setBusy(false);
      setAutoAttempted(true);
    }
  }

  useEffect(() => {
    if (!configured || !isMagicLink || autoAttempted || !email.trim()) return;
    void finishLogin(email);
  }, [autoAttempted, configured, email, isMagicLink]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void finishLogin();
  }

  return (
    <div className="authLayout authLayoutSingle">
      <section className="authPanel authHero">
        <div className="sectionEyebrow">Concluir acesso</div>
        <h2 className="pageTitle">Validando seu link seguro.</h2>
        <p className="pageLead">
          Se o link foi aberto no mesmo dispositivo, concluimos quase tudo automaticamente. Se nao, confirme abaixo o e-mail usado no inicio da sessao.
        </p>

        {!isMagicLink ? (
          <div className="inlineNotice inlineNoticeError">
            Este endereco nao contem um link de login valido. Volte para a tela de entrada e solicite um novo link.
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="authForm">
          <div className="field fieldLarge">
            <label>E-mail usado para receber o link</label>
            <input
              type="email"
              placeholder="voce@empresa.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="btnRow">
            <button className="btn btnPrimary btnLarge" disabled={busy || !isMagicLink}>
              {busy ? "Concluindo..." : "Concluir login"}
            </button>
            <Link className="btn btnGhost" to="/login">
              Voltar ao inicio
            </Link>
          </div>
        </form>

        {error ? <div className="inlineNotice inlineNoticeError">{error}</div> : null}
        <div className="helperRow">
          <span className="pill pillSoft">Passo 3 de 3</span>
        </div>
      </section>
    </div>
  );
}
