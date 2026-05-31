import { useMemo, useState } from "react";
import { ArrowRight, MailCheck, RotateCcw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { sendSignInLinkToEmail } from "firebase/auth";
import { continueUrl, getFirebaseAuth, isFirebaseConfigured } from "../lib/firebase";
import { getPendingEmail, setPendingEmail } from "../lib/storage";

export function CheckEmailPage() {
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
    } catch {
      setError("Nao foi possivel reenviar o link agora. Tente novamente em alguns instantes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="authCard authCardFlow">
      <div className="authCardHeader">
        <div className="authStatusMark">
          <MailCheck size={18} />
        </div>
        <div className="sectionEyebrow">Check your inbox</div>
        <h2 className="pageTitle">We sent a secure sign-in link.</h2>
        <p className="pageLead">
          {email ? (
            <>
              The next step is in <strong>{email}</strong>. Open the email and click the link to complete sign in.
            </>
          ) : (
            <>Open your email and click the link to complete sign in.</>
          )}
        </p>
      </div>

      <div className="authHintList">
        <p>Check spam or filtered folders. Delivery can take a few minutes.</p>
        <p>If opened on another device, confirm the same email used to request the link.</p>
      </div>

      <div className="btnRow authTertiaryActions">
        <button className="btn authSecondaryBlockButton" onClick={resend} disabled={busy}>
          <RotateCcw size={16} />
          <span>{busy ? "Resending..." : "Resend link"}</span>
        </button>
        <Link className="btn authSecondaryBlockButton" to="/login">
          Use another email
        </Link>
      </div>

      {sentAgain ? <div className="inlineNotice">A new sign-in link was sent. Use the latest email.</div> : null}
      {error ? <div className="inlineNotice inlineNoticeError">{error}</div> : null}

      <div className="helperRow authCardHelper authCardHelperSplit">
        <Link to="/login/complete" className="textLink authInlineAction">
          <span>I already clicked the link</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}
