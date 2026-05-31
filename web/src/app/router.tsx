import { Navigate, Route, Routes } from "react-router-dom";
import { ChartColumnBig, DatabaseZap, Globe, Sparkles } from "lucide-react";
import { AppLayout } from "./layout";
import { HomePage } from "@/features/home/HomePage";
import { DatasetOverviewPage } from "@/ui/pages/DatasetOverviewPage";
import { CheckEmailPage } from "@/ui/pages/CheckEmailPage";
import { CompleteLoginPage } from "@/ui/pages/CompleteLoginPage";
import { IngestionsPage } from "@/ui/pages/IngestionsPage";
import { LoginPage } from "@/ui/pages/LoginPage";
import { PlaceholderPage } from "@/ui/pages/PlaceholderPage";
import { ProcessingPage } from "@/ui/pages/ProcessingPage";
import { SessionPage } from "@/ui/pages/SessionPage";
import { TrackPage } from "@/ui/pages/TrackPage";
import { UploadPage } from "@/ui/pages/UploadPage";

function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="authShell">
      <div className="authFrame">
        <aside className="authFrameAside">
          <div className="authAsideGlow" />
          <div className="authAsideMesh" />

          <div className="authAsideBrand">
            <img src="/brand/main-logo-trimmed.png" alt="Dativerso" className="brandLogo" />
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
        <Route path="/ingestions" element={<IngestionsPage />} />
        <Route path="/processing/:ingestionId" element={<ProcessingPage />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/workspaces" element={<PlaceholderPage kind="projects" />} />
        <Route path="/datasets" element={<PlaceholderPage kind="datasets" />} />
        <Route path="/datasets/:ingestionId/overview" element={<DatasetOverviewPage />} />
        <Route path="/catalog" element={<PlaceholderPage kind="catalog" />} />
        <Route path="/sources" element={<PlaceholderPage kind="sources" />} />
        <Route path="/admin/users" element={<PlaceholderPage kind="users" />} />
        <Route path="/admin/settings" element={<PlaceholderPage kind="settings" />} />
      </Route>

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
