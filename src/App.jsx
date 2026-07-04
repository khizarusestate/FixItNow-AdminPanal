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
import AdminSettings from "./Components/AdminSettings";
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
import { getTheme } from "./config/theme";
import LiveNotificationHost from "./Components/shared/LiveNotificationHost.jsx";
import { useGlobalButtonSounds } from "./hooks/useGlobalButtonSounds.js";
import "./styles/globalStyles.css";

function AppContent({ onLogout }) {
  const { isSuperAdmin, admin } = useAdmin();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [profileAutoEdit, setProfileAutoEdit] = useState(false);

  // Add global button sounds
  useGlobalButtonSounds();

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
      case "settings":
        if (admin?.role !== "super_admin") {
          return <Dashboard onNavigate={setActiveSection} />;
        }
        return (
          <AdminSettings
            admin={admin}
            onBack={() => setActiveSection("dashboard")}
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
      className={`min-h-screen admin-panel-container flex ${
        isSuperAdmin ? `super-admin-panel ${getTheme(true).pageBg}` : getTheme(false).pageBg
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
        <main className="super-admin-main flex-1 p-6 animate-fadeIn min-w-0 overflow-auto">
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
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-violet-50/50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-slate-600">Loading...</p>
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
