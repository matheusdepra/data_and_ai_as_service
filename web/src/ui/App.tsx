import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { CheckEmailPage } from "./pages/CheckEmailPage";
import { CompleteLoginPage } from "./pages/CompleteLoginPage";
import { SessionPage } from "./pages/SessionPage";
import { UploadPage } from "./pages/UploadPage";
import { TrackPage } from "./pages/TrackPage";

function NavLink({ to, label }: { to: string; label: string }) {
  const loc = useLocation();
  const active = loc.pathname === to;
  return (
    <Link
      to={to}
      className={`navLink ${active ? "navLinkActive" : ""}`}
    >
      {label}
    </Link>
  );
}

export function App() {
  const location = useLocation();
  const isAuthRoute = location.pathname.startsWith("/login") || location.pathname.startsWith("/session");

  return (
    <div className={`shell ${isAuthRoute ? "shellAuth" : ""}`}>
      <div className="topbar">
        <div className="brand brandRow">
          <img src="/logo.jpeg" alt="Dativerso" className="brandLogo" />
          <div>
            <h1>Dativerso</h1>
            <p>Dados organizados para gente de negocio. Sem senha, sem friccao, sem adivinhacao.</p>
          </div>
        </div>
        <div className="nav">
          <NavLink to="/login" label="Entrar" />
          <NavLink to="/session" label="Sessao" />
          <NavLink to="/upload" label="Upload" />
          <NavLink to="/track" label="Acompanhar" />
        </div>
      </div>

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/check-email" element={<CheckEmailPage />} />
        <Route path="/login/complete" element={<CompleteLoginPage />} />
        <Route path="/session" element={<SessionPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/track" element={<TrackPage />} />
      </Routes>
    </div>
  );
}
