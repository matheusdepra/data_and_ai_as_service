import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { CheckEmailPage } from "./pages/CheckEmailPage";
import { CompleteLoginPage } from "./pages/CompleteLoginPage";
import { SessionPage } from "./pages/SessionPage";
import { UploadPage } from "./pages/UploadPage";
import { TrackPage } from "./pages/TrackPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";

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

export function App() {
  const location = useLocation();
  const isLoginRoute = location.pathname.startsWith("/login");

  const routes = (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/session" element={<SessionPage />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/track" element={<TrackPage />} />
      <Route path="/datasets" element={<PlaceholderPage kind="datasets" />} />
      <Route path="/catalog" element={<PlaceholderPage kind="catalog" />} />
      <Route path="/sources" element={<PlaceholderPage kind="sources" />} />
      <Route path="/settings" element={<PlaceholderPage kind="settings" />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );

  if (isLoginRoute) {
    return (
      <AuthFrame>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/check-email" element={<CheckEmailPage />} />
          <Route path="/login/complete" element={<CompleteLoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthFrame>
    );
  }

  return (
    <AppShell>
      {routes}
    </AppShell>
  );
}
