import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { UploadPage } from "./pages/UploadPage";
import { TrackPage } from "./pages/TrackPage";

function NavLink({ to, label }: { to: string; label: string }) {
  const loc = useLocation();
  const active = loc.pathname === to;
  return (
    <Link
      to={to}
      style={{
        borderColor: active ? "rgba(119, 180, 255, 0.55)" : undefined,
        background: active ? "rgba(119, 180, 255, 0.12)" : undefined,
      }}
    >
      {label}
    </Link>
  );
}

export function App() {
  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <h1>Dativerso</h1>
          <p>Upload, lineage e camadas. Um MVP pragmático para sair do caos.</p>
        </div>
        <div className="nav">
          <NavLink to="/upload" label="Upload" />
          <NavLink to="/track" label="Acompanhar" />
        </div>
      </div>

      <Routes>
        <Route path="/" element={<Navigate to="/upload" replace />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/track" element={<TrackPage />} />
      </Routes>
    </div>
  );
}

