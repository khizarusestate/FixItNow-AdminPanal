import AdminTopBar from "./Components/AdminTopBar";
import Sidebar from "./Components/Sidebar";
import Dashboard from "./Components/Dashboard";
import Bookings from "./Components/Bookings";
import Workers from "./Components/Workers";
import Customers from "./Components/Customers";
import Services from "./Components/Services";
import Revenue from "./Components/Revenue";
import Advertisements from "./Components/Advertisements";
import Reviews from "./Components/Reviews";
import AdminProfile from "./Components/AdminProfile";
import TeamManagement from "./Components/TeamManagement";
import AdminsActivity from "./Components/AdminsActivity";
import ErrorBoundary from "./Components/ErrorBoundary";
import PinLogin from "./Components/PinLogin";
import AdminBootstrapGate from "./Components/AdminBootstrapGate";
import { SocketProvider } from "./context/SocketContext";
import { AdminProvider } from "./context/AdminContext";
import { useState, useEffect } from "react";
import { isAdminAuthenticated, clearAdminToken } from "./lib/api";
import { useAdmin } from "./context/AdminContext";
import LiveNotificationHost from "./Components/shared/LiveNotificationHost.jsx";

function AppContent({ onLogout }) {
  const { isSuperAdmin } = useAdmin();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [profileAutoEdit, setProfileAutoEdit] = useState(false);

  const handleLogout = () => {
    clearAdminToken();
    onLogout();
  };

  const openProfileSettings = () => {
    setProfileAutoEdit(true);
    setActiveSection("profile");
  };

  useEffect(() => {
    const onNavigate = (e) => {
      const section = e.detail?.section;
      if (section) setActiveSection(section);
    };
    window.addEventListener("admin-navigate", onNavigate);
    return () => window.removeEventListener("admin-navigate", onNavigate);
  }, []);

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <Dashboard onNavigate={setActiveSection} />;
      case "bookings":
        return <Bookings />;
      case "workers":
        return <Workers />;
      case "customers":
        return <Customers />;
      case "services":
        return <Services />;
      case "revenue":
        return <Revenue />;
      case "advertisements":
        return <Advertisements />;
      case "reviews":
        return <Reviews />;
      case "profile":
        return (
          <AdminProfile
            autoEdit={profileAutoEdit}
            onAutoEditConsumed={() => setProfileAutoEdit(false)}
          />
        );
      case "team":
        return <TeamManagement />;
      case "admins-activity":
        return <AdminsActivity />;
      default:
        return <Dashboard onNavigate={setActiveSection} />;
    }
  };

  return (
    <div
      className={`min-h-screen admin-shell flex ${
        isSuperAdmin ? "super-admin-panel" : ""
      }`}
    >
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <AdminTopBar
          activeSection={activeSection}
          onNavigate={setActiveSection}
          onLogout={handleLogout}
          onOpenProfileSettings={openProfileSettings}
        />
        <main className="super-admin-main flex-1 overflow-auto p-5 sm:p-6 lg:p-8 animate-fadeIn min-w-0">
          {renderContent()}
        </main>
      </div>
      <LiveNotificationHost />
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState("");

  useEffect(() => {
    const token = isAdminAuthenticated();
    setIsAuthenticated(!!token);
    setIsCheckingAuth(false);
  }, []);

  useEffect(() => {
    const handleLogoutEvent = (e) => {
      setIsAuthenticated(false);
      setSessionExpired(true);
      setLogoutMessage(e?.detail?.reason || "");
    };
    window.addEventListener("admin-logout", handleLogoutEvent);
    return () => window.removeEventListener("admin-logout", handleLogoutEvent);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setSessionExpired(false);
    setLogoutMessage("");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (isCheckingAuth) {
    return (
      <div className="admin-shell grid min-h-screen place-items-center">
        <div className="animate-scale-in admin-card w-full max-w-sm px-8 py-10 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
          <p className="text-sm font-medium text-[var(--text-muted)]">Loading admin…</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AdminProvider>
        {!isAuthenticated ? (
          <PinLogin
            onLogin={handleLogin}
            sessionExpired={sessionExpired}
            logoutMessage={logoutMessage}
          />
        ) : (
          <SocketProvider>
            <AdminBootstrapGate>
              <AppContent onLogout={handleLogout} />
            </AdminBootstrapGate>
          </SocketProvider>
        )}
      </AdminProvider>
    </ErrorBoundary>
  );
}
