import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layout";
import { HomePage } from "@/features/home/HomePage";
import { CheckEmailPage } from "@/ui/pages/CheckEmailPage";
import { CompleteLoginPage } from "@/ui/pages/CompleteLoginPage";
import { LoginPage } from "@/ui/pages/LoginPage";
import { PlaceholderPage } from "@/ui/pages/PlaceholderPage";
import { SessionPage } from "@/ui/pages/SessionPage";
import { TrackPage } from "@/ui/pages/TrackPage";
import { UploadPage } from "@/ui/pages/UploadPage";

function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="authShell">
      <header className="authTopbar">
        <div className="brand brandRow">
          <img src="/logo.jpeg" alt="Dativerso" className="brandLogo" />
          <div>
            <h1>Dativerso</h1>
            <p>Dados organizados para sua empresa acompanhar, preparar e consumir com seguranca.</p>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route
        path="/login"
        element={
          <AuthFrame>
            <LoginPage />
          </AuthFrame>
        }
      />
      <Route
        path="/login/check-email"
        element={
          <AuthFrame>
            <CheckEmailPage />
          </AuthFrame>
        }
      />
      <Route
        path="/login/complete"
        element={
          <AuthFrame>
            <CompleteLoginPage />
          </AuthFrame>
        }
      />

      <Route element={<AppLayout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
        <Route path="/session" element={<SessionPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/workspaces" element={<PlaceholderPage kind="datasets" />} />
        <Route path="/datasets" element={<PlaceholderPage kind="datasets" />} />
        <Route path="/catalog" element={<PlaceholderPage kind="catalog" />} />
        <Route path="/sources" element={<PlaceholderPage kind="sources" />} />
      </Route>

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
