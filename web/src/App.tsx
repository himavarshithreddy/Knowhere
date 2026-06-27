import { type ReactNode, useEffect, useLayoutEffect, Suspense, lazy } from "react";
import { BrowserRouter, NavLink, Navigate, Outlet, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import { BookOpen as BookOpenIcon, Compass as CompassIcon, Heart as HeartIcon, Settings as SettingsGearIcon, Target as TargetIcon } from "lucide-react";
import { AppLoader } from "./components/AppLoader";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DataProvider, useData } from "./contexts/DataContext";
import { useToast } from "./contexts/ToastContext";
import { trackNavigation } from "./lib/navigation";
import { registerSW } from "virtual:pwa-register";
import "./styles.css";

const Enter = lazy(() => import("./pages/Enter").then(m => ({ default: m.Enter })));

const Recover = lazy(() => import("./pages/Recover").then(m => ({ default: m.Recover })));
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Missions = lazy(() => import("./pages/Missions").then(m => ({ default: m.Missions })));
const Library = lazy(() => import("./pages/Library").then(m => ({ default: m.Library })));
const Settings = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));

function LocationTracker() {
  const location = useLocation();
  useLayoutEffect(() => {
    trackNavigation(location.key);
  }, [location.key]);
  return null;
}

function PwaUpdater() {
  const { addToast } = useToast();
  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        addToast({
          message: "New update available!",
          type: "info",
          duration: 0,
          action: {
            label: "Reload",
            onClick: () => updateSW(true),
          },
        });
      },
      onOfflineReady() {
        // Silently ready for offline
      },
    });
  }, [addToast]);
  return null;
}

function PostAuthRedirect() {
  return <Navigate to="/dashboard" replace />;
}

function LoginRedirect() {
  const [searchParams] = useSearchParams();
  return <Navigate to={`/?${searchParams.toString()}`} replace />;
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
    <Suspense fallback={null}>
      <ShellAmbient />
    </Suspense>
    <Suspense fallback={null}>
      <ShellSidebar />
    </Suspense>
    <Outlet />
    <MobileNav />
  </div>;
}

function AppRoutes() {
  return <DataProvider>
    <Suspense fallback={<AppLoader message="Loading workspace..." />}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/library" element={<Library />} />
          <Route path="/favorites" element={<Library mode="favorites" />} />
          <Route path="/archive" element={<Library mode="archive" />} />
          <Route path="/trash" element={<Library mode="trash" />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  </DataProvider>;
}

const ShellAmbient = lazy(() => import("./components/WorkspaceAmbient").then(m => ({ default: m.WorkspaceAmbient })));
const ShellSidebar = lazy(() => import("./components/Sidebar").then(m => ({ default: m.Sidebar })));
const CustomCursor = lazy(() => import("./components/CustomCursor").then(m => ({ default: m.CustomCursor })));

function MobileNav() {
  return <nav className="mobile-nav">
    <NavLink to="/dashboard"><CompassIcon /><span>Home</span></NavLink>
    <NavLink to="/missions"><TargetIcon /><span>Missions</span></NavLink>
    <NavLink to="/library"><BookOpenIcon /><span>Library</span></NavLink>
    <NavLink to="/favorites"><HeartIcon /><span>Favorites</span></NavLink>
    <NavLink to="/settings"><SettingsGearIcon /><span>Settings</span></NavLink>
  </nav>;
}

export default function App() {
  return <BrowserRouter>
    <LocationTracker />
    <PwaUpdater />
    <Suspense fallback={null}><CustomCursor /></Suspense>
    <AuthProvider>
      <Routes>
        <Route path="/" element={
          <Suspense fallback={null}>
            <Enter />
          </Suspense>
        } />
        <Route path="/*" element={
          <Suspense fallback={<AppLoader />}>
            <Routes>
              <Route path="/recover" element={<Recover />} />
              <Route path="/login" element={<LoginRedirect />} />
              <Route path="/welcome" element={<Navigate to="/dashboard" replace />} />
              <Route path="/*" element={<RequireAuth><AppRoutes /></RequireAuth>} />
            </Routes>
          </Suspense>
        } />
      </Routes>
    </AuthProvider>
  </BrowserRouter>;
}
