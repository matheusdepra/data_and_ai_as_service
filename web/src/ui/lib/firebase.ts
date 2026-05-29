import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

function readConfig(): FirebaseConfig {
  const apiKey = (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined)?.trim() ?? "";
  const authDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined)?.trim() ?? "";
  const projectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined)?.trim() ?? "";
  const appId = (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined)?.trim() ?? "";

  return { apiKey, authDomain, projectId, appId };
}

export function isFirebaseConfigured(): boolean {
  const cfg = readConfig();
  return Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);
}

export function getFirebaseAuth() {
  const cfg = readConfig();
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase Web Auth nao configurado. Defina VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID e VITE_FIREBASE_APP_ID."
    );
  }

  const app = getApps().length ? getApp() : initializeApp(cfg);
  return getAuth(app);
}

export function continueUrl(): string {
  const override = (import.meta.env.VITE_AUTH_CONTINUE_URL as string | undefined)?.trim();
  return override || `${window.location.origin}/login/complete`;
}
