const TOKEN_KEY = "dv.jwt";
const EMAIL_KEY = "dv.auth.email";

export function getJwt(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setJwt(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearJwt() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getPendingEmail(): string {
  return localStorage.getItem(EMAIL_KEY) ?? "";
}

export function setPendingEmail(email: string) {
  localStorage.setItem(EMAIL_KEY, email);
}

export function clearPendingEmail() {
  localStorage.removeItem(EMAIL_KEY);
}
