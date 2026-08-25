import AdminTopBar from "./Components/AdminTopBar";
import SupportHeaderButton from "./Components/SupportHeaderButton";
import Sidebar from "./Components/Sidebar";
import Dashboard from "./Components/Dashboard";
import Bookings from "./Components/Bookings";
import Workers from "./Components/Workers";
import Customers from "./Components/Customers";
import Services from "./Components/Services";
import Revenue from "./Components/Revenue";
import Advertisements from "./Components/Advertisements";
import Reviews from "./Components/Reviews";
import SupportMessages from "./Components/SupportMessages";
import AdminProfile from "./Components/AdminProfile";
import AdminSettings from "./Components/AdminSettings";
import TeamManagement from "./Components/TeamManagement";
import AdminsActivity from "./Components/AdminsActivity";
import ErrorBoundary from "./Components/ErrorBoundary";
import PinLogin from "./Components/PinLogin";
import AdminBootstrapGate from "./Components/AdminBootstrapGate";
import SupportVoiceCallPanel from "./Components/SupportVoiceCallPanel";
import { SocketProvider } from "./context/SocketContext";
import { AdminProvider } from "./context/AdminContext";
import { useState, useEffect } from "react";
import { isAdminAuthenticated, clearAdminToken } from "./lib/api";
import { useAdmin } from "./context/AdminContext";
import { getTheme } from "./config/theme";
import LiveNotificationHost from "./Components/shared/LiveNotificationHost.jsx";
import { startSupportVoiceCallSocket } from "./services/supportVoiceCallSocket.js";
import { useGlobalButtonSounds } from "./hooks/useGlobalButtonSounds.js";
import "./styles/globalStyles.css";

function AppContent({ onLogout }) {
  const { isSuperAdmin, admin } = useAdmin();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [profileAutoEdit, setProfileAutoEdit] = useState(false);

  useGlobalButtonSounds();

  useEffect(() => startSupportVoiceCallSocket(), []);

  const handleLogout = () => { clearAdminToken(); onLogout(); };

  const openProfileSettings = (section) => {
    if (section === "profile") { setProfileAutoEdit(true); setActiveSection("profile"); return; }
    if (section === "settings") { setProfileAutoEdit(false); setActiveSection("settings"); }
  };

  useEffect(() => {
    const onNavigate = (e) => { const section = e.detail?.section; if (section) setActiveSection(section); };
    window.addEventListener("admin-navigate", onNavigate);
    return () => window.removeEventListener("admin-navigate", onNavigate);
  }, []);

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard": return <Dashboard onNavigate={setActiveSection} />;
      case "bookings": return <Bookings />;
      case "workers": return <Workers />;
      case "customers": return <Customers />;
      case "services": return <Services />;
      case "support-messages": return <SupportMessages />;
      case "revenue": return isSuperAdmin ? <Revenue /> : <Dashboard onNavigate={setActiveSection} />;
      case "advertisements": return <Advertisements />;
      case "reviews": return <Reviews />;
      case "profile": return <AdminProfile autoEdit={profileAutoEdit} onAutoEditConsumed={() => setProfileAutoEdit(false)} />;
      case "settings": return admin?.role === "super_admin" ? <AdminSettings admin={admin} onBack={() => setActiveSection("dashboard")} /> : <Dashboard onNavigate={setActiveSection} />;
      case "team": return <TeamManagement />;
      case "admins-activity": return <AdminsActivity />;
      default: return <Dashboard onNavigate={setActiveSection} />;
    }
  };

  return (
    <div className={`min-h-screen admin-panel-container flex ${isSuperAdmin ? `super-admin-panel ${getTheme(true).pageBg}` : getTheme(false).pageBg}`}>
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <div className="relative">
          <AdminTopBar activeSection={activeSection} onNavigate={setActiveSection} onLogout={handleLogout} onOpenProfileSettings={openProfileSettings} />
          <div className="absolute right-[6rem] top-2 z-30">
            <SupportHeaderButton onNavigate={setActiveSection} />
          </div>
        </div>
        <main className="super-admin-main flex-1 p-6 animate-fadeIn min-w-0 overflow-auto">{renderContent()}</main>
      </div>
      <SupportVoiceCallPanel />
      <LiveNotificationHost />
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState("");

  useEffect(() => { setIsAuthenticated(!!isAdminAuthenticated()); setIsCheckingAuth(false); }, []);
  useEffect(() => {
    const handleLogoutEvent = (e) => { setIsAuthenticated(false); setSessionExpired(true); setLogoutMessage(e?.detail?.reason || ""); };
    window.addEventListener("admin-logout", handleLogoutEvent);
    return () => window.removeEventListener("admin-logout", handleLogoutEvent);
  }, []);

  if (isCheckingAuth) return <div className="min-h-screen flex items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" /></div>;

  return (
    <ErrorBoundary>
      <AdminProvider>
        {!isAuthenticated ? <PinLogin onLogin={() => { setIsAuthenticated(true); setSessionExpired(false); setLogoutMessage(""); }} sessionExpired={sessionExpired} logoutMessage={logoutMessage} /> : (
          <SocketProvider><AdminBootstrapGate><AppContent onLogout={() => setIsAuthenticated(false)} /></AdminBootstrapGate></SocketProvider>
        )}
      </AdminProvider>
    </ErrorBoundary>
  );
}
