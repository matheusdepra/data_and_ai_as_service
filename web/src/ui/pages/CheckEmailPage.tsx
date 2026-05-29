import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { sendSignInLinkToEmail } from "firebase/auth";
import { continueUrl, getFirebaseAuth, isFirebaseConfigured } from "../lib/firebase";
import { getPendingEmail, setPendingEmail } from "../lib/storage";

function emailClientLink(email: string): string {
  const normalized = email.toLowerCase();
  if (normalized.endsWith("@gmail.com")) return "https://mail.google.com";
  if (normalized.endsWith("@outlook.com") || normalized.endsWith("@hotmail.com") || normalized.endsWith("@live.com")) {
    return "https://outlook.live.com/mail";
  }
  return "mailto:";
}

export function CheckEmailPage() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentAgain, setSentAgain] = useState(false);

  const email = useMemo(() => {
    const fromUrl = search.get("email")?.trim().toLowerCase() ?? "";
    return fromUrl || getPendingEmail();
  }, [search]);

  async function resend() {
    setBusy(true);
    setError("");
    setSentAgain(false);
    try {
      if (!isFirebaseConfigured()) {
        throw new Error("Firebase Web Auth ainda nao foi configurado neste frontend.");
      }
      if (!email) {
        throw new Error("Nao encontramos o e-mail desta tentativa. Volte e informe o e-mail novamente.");
      }
      const auth = getFirebaseAuth();
      await sendSignInLinkToEmail(auth, email, {
        url: continueUrl(),
        handleCodeInApp: true,
      });
      setPendingEmail(email);
      setSentAgain(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel reenviar o link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authLayout authLayoutSingle">
      <section className="authPanel authHero">
        <div className="sectionEyebrow">Verifique sua caixa de entrada</div>
        <h2 className="pageTitle">Enviamos um link de acesso.</h2>
        <p className="pageLead">
          {email ? (
            <>
              O proximo passo esta no e-mail <strong>{email}</strong>. Abra a mensagem e clique no link para concluir sua entrada.
            </>
          ) : (
            <>O proximo passo esta no seu e-mail. Abra a mensagem e clique no link para concluir sua entrada.</>
          )}
        </p>

        <div className="supportGrid">
          <div className="supportCard">
            <strong>Se nao encontrou o e-mail</strong>
            <p>Revise spam, promocionais e filtros corporativos. O link pode levar alguns minutos.</p>
          </div>
          <div className="supportCard">
            <strong>Se abriu em outro dispositivo</strong>
            <p>Voce pode concluir o login assim mesmo, mas talvez o app peça o e-mail novamente por seguranca.</p>
          </div>
        </div>

        <div className="btnRow">
          <a className="btn btnPrimary btnLarge" href={emailClientLink(email)} target="_blank" rel="noreferrer">
            Abrir meu e-mail
          </a>
          <button className="btn" onClick={resend} disabled={busy}>
            {busy ? "Reenviando..." : "Reenviar link"}
          </button>
          <Link className="btn btnGhost" to="/login">
            Usar outro e-mail
          </Link>
        </div>

        {sentAgain ? <div className="inlineNotice">Link reenviado. Use sempre a mensagem mais recente.</div> : null}
        {error ? <div className="inlineNotice inlineNoticeError">{error}</div> : null}

        <div className="helperRow">
          <span className="pill pillSoft">Passo 2 de 3</span>
          <Link to="/login/complete" className="textLink">
            Ja cliquei no link
          </Link>
        </div>
      </section>
    </div>
  );
}
