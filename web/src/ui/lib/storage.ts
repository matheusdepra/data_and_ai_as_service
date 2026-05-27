const TOKEN_KEY = "dv.jwt";

export function getJwt(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setJwt(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

