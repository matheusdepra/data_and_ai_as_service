const AUTH_SESSION_KEY = "dv.auth.session";
const EMAIL_KEY = "dv.auth.email";

export type AuthSession = {
  idToken: string;
  sub: string;
  email: string;
  tenant_id: string;
  role: string;
  issued_at: string;
};

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getAuthSession(): AuthSession | null {
  const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) return null;
  const parsed = safeParse<AuthSession>(raw);
  if (!parsed?.idToken) return null;
  return parsed;
}

export function setAuthSession(session: AuthSession) {
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
}

export function getJwt(): string {
  return getAuthSession()?.idToken ?? "";
}

export function setJwt(token: string) {
  const current = getAuthSession();
  setAuthSession({
    idToken: token,
    sub: current?.sub ?? "",
    email: current?.email ?? "",
    tenant_id: current?.tenant_id ?? "",
    role: current?.role ?? "",
    issued_at: current?.issued_at ?? new Date().toISOString(),
  });
}

export function clearJwt() {
  clearAuthSession();
}

export function getPendingEmail(): string {
  const fromSession = sessionStorage.getItem(EMAIL_KEY) ?? "";
  if (fromSession) return fromSession;
  return localStorage.getItem(EMAIL_KEY) ?? "";
}

export function setPendingEmail(email: string) {
  sessionStorage.setItem(EMAIL_KEY, email);
  localStorage.setItem(EMAIL_KEY, email);
}

export function clearPendingEmail() {
  sessionStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(EMAIL_KEY);
}
