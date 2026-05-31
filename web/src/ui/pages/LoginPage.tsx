import { FormEvent, useMemo, useState } from "react";
import { ChevronRight, LockKeyhole, Mail, Send, ShieldCheck } from "lucide-react";
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
    } catch {
      setError("Nao foi possivel enviar o link agora. Tente novamente em alguns instantes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="authCard authCardLogin">
      <div className="authCardHeader authCardHeaderCentered">
        <h2 className="pageTitle">Sign in to Dativerso</h2>
        <p className="pageLead">Access your data workspace.</p>
      </div>

      <form onSubmit={onSubmit} className="authForm">
        <div className="authFormSection">
          <div className="authFormLabel">Magic link (recommended)</div>
          <div className="field authField">
            <label>Work email</label>
            <div className="authInputShell">
              <Mail size={18} />
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="btnRow authPrimaryActionRow">
            <button className="btn btnPrimary btnLarge authCtaButton" disabled={busy}>
              <Send size={16} />
              <span>{busy ? "Sending..." : "Send magic link"}</span>
            </button>
          </div>
        </div>

        {error ? <div className="inlineNotice inlineNoticeError">{error}</div> : null}
        {!configured ? (
          <div className="inlineNotice">
            Configure `VITE_FIREBASE_*` before using the real authentication flow.
          </div>
        ) : null}
      </form>

      <div className="authDivider">
        <span>or</span>
      </div>

      <details className="passwordPlaceholder">
        <summary>
          <span className="passwordSummaryLabel">
            <ChevronRight size={16} />
            <span>Sign in with password</span>
          </span>
        </summary>
        <div className="passwordPlaceholderBody">
          <div className="field authField">
            <label>Email</label>
            <div className="authInputShell">
              <Mail size={18} />
              <input disabled value={email} readOnly placeholder="Work email" />
            </div>
          </div>
          <div className="field authField">
            <label>Password</label>
            <div className="authInputShell">
              <LockKeyhole size={18} />
              <input type="password" disabled value="********" readOnly />
            </div>
          </div>
          <div className="authPasswordMeta">
            <span>Remember me</span>
            <span>Forgot password?</span>
          </div>
          <div className="btnRow">
            <button className="btn authSecondaryBlockButton" disabled>
              Sign in
            </button>
          </div>
          <div className="passwordPlaceholderHint">Temporarily unavailable.</div>
        </div>
      </details>

      <div className="authCardFootnote">
        <p>Don&apos;t have access yet?</p>
        <p className="authFootnoteLink">Contact your company administrator</p>
      </div>

      <div className="helperRow authCardHelper">
        <span className="authHelperBadge">
          <ShieldCheck size={14} />
          Secure session
        </span>
        <Link className="textLink" to="/session">
          Session diagnostics
        </Link>
      </div>
    </section>
  );
}
