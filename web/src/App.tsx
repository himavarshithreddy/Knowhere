import { type ReactNode } from "react";
import { BrowserRouter, NavLink, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Archive, BookOpen, Heart, Settings as SettingsIcon } from "lucide-react";
import { BrandMark } from "./components/BrandMark";
import { CustomCursor } from "./components/CustomCursor";
import { Sidebar } from "./components/Sidebar";
import { WorkspaceAmbient } from "./components/WorkspaceAmbient";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DataProvider, useData } from "./contexts/DataContext";
import { Enter } from "./pages/Enter";
import { Recover } from "./pages/Recover";
import { Library } from "./pages/Library";
import { Settings } from "./pages/Settings";
import "./styles.css";

function AppLoader({ message }: { message?: string }) {
  return <div className="app-loader">
    <BrandMark compact className="app-loader-brand" />
    {message && <p>{message}</p>}
  </div>;
}

function PostAuthRedirect() {
  return <Navigate to="/library" replace />;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <AppLoader />;
  if (user) return <DataProvider><PostAuthRedirect /></DataProvider>;
  return children;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <AppLoader />;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function Shell() {
  const { profile, loading } = useData();

  if (loading || !profile) return <AppLoader message="Docking at Knowhere..." />;

  return <div className="app-shell">
    <WorkspaceAmbient />
    <Sidebar />
    <Outlet />
    <nav className="mobile-nav">
      <NavLink to="/library"><BookOpen /><span>Discoveries</span></NavLink>
      <NavLink to="/favorites"><Heart /><span>Favorites</span></NavLink>
      <NavLink to="/archive"><Archive /><span>Archive</span></NavLink>
      <NavLink to="/settings"><SettingsIcon /><span>Settings</span></NavLink>
    </nav>
  </div>;
}

function AppRoutes() {
  return <DataProvider>
    <Routes>
      <Route element={<Shell />}>
        <Route path="/library" element={<Library />} />
        <Route path="/favorites" element={<Library mode="favorites" />} />
        <Route path="/archive" element={<Library mode="archive" />} />
        <Route path="/trash" element={<Library mode="trash" />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/library" replace />} />
      </Route>
    </Routes>
  </DataProvider>;
}

export default function App() {
  return <BrowserRouter>
    <CustomCursor />
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Enter />} />
        <Route path="/recover" element={<Recover />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/welcome" element={<Navigate to="/library" replace />} />
        <Route path="/*" element={<RequireAuth><AppRoutes /></RequireAuth>} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>;
}
