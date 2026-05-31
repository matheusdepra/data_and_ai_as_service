import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ChartColumnBig, DatabaseZap, Globe, Sparkles } from "lucide-react";
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
      <div className="authFrame">
        <aside className="authFrameAside">
          <div className="authAsideGlow" />
          <div className="authAsideMesh" />

          <div className="authAsideBrand">
            <img src="/logo.jpeg" alt="Dativerso" className="brandLogo" />
            <strong>Dativerso</strong>
          </div>

          <div className="authAsideContent">
            <h1>AI Data Workspace</h1>
            <p>Upload, understand and transform data through conversation.</p>

            <div className="authFeatureList">
              <div className="authFeatureCard">
                <span className="authFeatureIcon">
                  <DatabaseZap size={18} />
                </span>
                <div>
                  <strong>Upload any dataset</strong>
                  <p>Connect your data from multiple sources in seconds.</p>
                </div>
              </div>

              <div className="authFeatureCard">
                <span className="authFeatureIcon">
                  <Sparkles size={18} />
                </span>
                <div>
                  <strong>Understand with AI</strong>
                  <p>Ask questions and get instant insights about your data.</p>
                </div>
              </div>

              <div className="authFeatureCard">
                <span className="authFeatureIcon">
                  <ChartColumnBig size={18} />
                </span>
                <div>
                  <strong>Build data assets</strong>
                  <p>Create datasets, metrics and dashboards without writing code.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="authAsideFooter">Secure access to your AI data workspace.</div>
        </aside>

        <main className="authFrameMain">
          <header className="authFrameHeader">
            <div className="authLocale">
              <Globe size={16} />
              <span>English</span>
            </div>
          </header>

          <div className="authFrameContent">{children}</div>

          <footer className="authFrameFooter">
            <div className="authFooterLinks">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>Help</span>
            </div>
            <p>© 2024 Dativerso. All rights reserved.</p>
          </footer>
        </main>
      </div>
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
