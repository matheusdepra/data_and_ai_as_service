import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Link2, RotateCcw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { getMe } from "../lib/api";
import { getFirebaseAuth, isFirebaseConfigured } from "../lib/firebase";
import { clearPendingEmail, getPendingEmail, setAuthSession } from "../lib/storage";

export function CompleteLoginPage() {
  const navigate = useNavigate();
  const configured = isFirebaseConfigured();
  const pendingEmail = getPendingEmail();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [autoAttempted, setAutoAttempted] = useState(false);

  const isMagicLink = useMemo(() => {
    if (!configured) return false;
    return isSignInWithEmailLink(getFirebaseAuth(), window.location.href);
  }, [configured]);

  async function finishLogin(emailValue: string) {
    setBusy(true);
    setError("");
    try {
      if (!configured) {
        throw new Error("Firebase Web Auth ainda nao foi configurado neste frontend.");
      }
      if (!isMagicLink) {
        throw new Error("Este link nao parece ser um link valido de login por e-mail.");
      }
      const auth = getFirebaseAuth();
      const result = await signInWithEmailLink(auth, emailValue, window.location.href);
      const idToken = await result.user.getIdToken(true);
      const me = await getMe({ jwt: idToken });
      setAuthSession({
        idToken,
        sub: me.sub,
        email: me.email,
        tenant_id: me.tenant_id,
        role: me.role,
        issued_at: new Date().toISOString(),
      });
      clearPendingEmail();
      navigate("/home", { replace: true });
    } catch (err) {
      setError("Nao foi possivel concluir seu acesso agora. Tente novamente em alguns instantes.");
    } finally {
      setBusy(false);
      setAutoAttempted(true);
    }
  }

  useEffect(() => {
    if (autoAttempted) return;
    if (!configured || !isMagicLink) {
      setBusy(false);
      setAutoAttempted(true);
      return;
    }
    if (!pendingEmail.trim()) {
      setBusy(false);
      setError("We could not complete sign-in automatically on this device. Request a new link.");
      setAutoAttempted(true);
      return;
    }
    void finishLogin(pendingEmail.trim().toLowerCase());
  }, [autoAttempted, configured, isMagicLink, pendingEmail]);

  return (
    <section className="authCard authCardFlow">
      <div className="authCardHeader">
        <div className="authStatusMark">
          <Link2 size={18} />
        </div>
        <div className="sectionEyebrow">Complete access</div>
        <h2 className="pageTitle">Finalizing your secure sign-in.</h2>
        <p className="pageLead">
          We are validating your magic link and preparing your workspace access.
        </p>
      </div>

      {!isMagicLink ? (
        <div className="inlineNotice inlineNoticeError">
          This URL does not contain a valid sign-in link. Request a new link to continue.
        </div>
      ) : null}

      {busy ? <div className="inlineNotice">Validating your session...</div> : null}

      {error ? <div className="inlineNotice inlineNoticeError">{error}</div> : null}

      {!busy ? (
        <div className="btnRow authStackedActions">
          <Link className="btn authSecondaryBlockButton" to="/login">
            <RotateCcw size={16} />
            <span>Request new link</span>
          </Link>
          <Link className="btn authSecondaryBlockButton" to="/home">
            <ArrowLeft size={16} />
            <span>Back to home</span>
          </Link>
        </div>
      ) : null}

      <div className="helperRow authCardHelper">
        <span className="pill pillSoft">Step 3 of 3</span>
      </div>
    </section>
  );
}
