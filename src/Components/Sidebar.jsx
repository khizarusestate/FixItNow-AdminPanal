import { Menu, X, Crown, ChevronLeft, LayoutGrid } from "lucide-react";
import { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import {
  ADMIN_MENU_ITEMS,
  SUPER_ADMIN_ROOT_ITEMS,
  OPERATIONS_MENU_ITEMS,
  isOperationsSection,
} from "../config/navigation";
import AdminLogo from "./shared/AdminLogo";
import { useAdmin } from "../context/AdminContext";
import { getTheme } from "../config/theme";

function NavButton({
  item,
  isActive,
  badgeCount,
  theme,
  isSuperAdmin,
  onClick,
}) {
  const Icon = item.icon;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`
          w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 group
          ${
            isActive
              ? `bg-gradient-to-r ${theme.navActive} text-white shadow-lg`
              : theme.navIdle
          }
        `}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg transition-colors ${
              isActive ? "bg-white/20" : theme.navIconBg
            }`}
          >
            <Icon
              size={18}
              className={isActive ? "text-white" : theme.navIcon}
            />
          </div>
          <span className="font-semibold text-left">{item.label}</span>
        </div>

        {badgeCount > 0 && (
          <span
            className={`flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold px-1.5 ${
              isActive
                ? "bg-white text-violet-700"
                : isSuperAdmin
                  ? "bg-violet-500 text-white animate-pulse"
                  : "bg-orange-500 text-white animate-pulse"
            }`}
          >
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}

        {isActive && !badgeCount && (
          <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
        )}
      </button>
    </li>
  );
}

export default function Sidebar({ activeSection, setActiveSection }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [superView, setSuperView] = useState("root");
  const { badges, clearBadge } = useSocket();
  const { isSuperAdmin } = useAdmin();
  const theme = getTheme(isSuperAdmin);

  useEffect(() => {
    if (!isSuperAdmin) return;
    if (isOperationsSection(activeSection)) {
      setSuperView("operations");
    } else if (activeSection === "dashboard" || activeSection === "team") {
      setSuperView("root");
    }
  }, [activeSection, isSuperAdmin]);

  const goToSection = (id, badgeKey) => {
    setActiveSection(id);
    setIsMobileMenuOpen(false);
    if (badgeKey && badges[badgeKey] > 0) clearBadge(badgeKey);
  };

  const openOperationsHub = () => {
    setSuperView("operations");
    if (!isOperationsSection(activeSection)) {
      goToSection("bookings", "bookings");
    } else {
      setIsMobileMenuOpen(false);
    }
  };

  const backToSuperRoot = () => {
    setSuperView("root");
    if (isOperationsSection(activeSection)) {
      setActiveSection("dashboard");
    }
    setIsMobileMenuOpen(false);
  };

  const operationsBadgeTotal = OPERATIONS_MENU_ITEMS.reduce(
    (sum, item) => sum + (item.badgeKey ? badges[item.badgeKey] || 0 : 0),
    0,
  );

  const hubActive =
    isSuperAdmin &&
    (superView === "operations" || isOperationsSection(activeSection));

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className={`lg:hidden fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r ${theme.fab} text-white shadow-xl hover:shadow-2xl transition-all`}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside
        className={`
        fixed lg:static inset-y-0 left-0 z-40 w-72 bg-gradient-to-b ${theme.sidebar} shadow-xl
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <div className="flex h-full flex-col">
          <div
            className={`p-6 border-b flex flex-col items-center gap-2 ${
              isSuperAdmin ? "border-violet-800/40" : "border-orange-200"
            }`}
          >
            {isSuperAdmin ? (
              <>
                <div className="p-3 rounded-2xl bg-violet-600/20 border border-violet-500/30">
                  <Crown size={32} className="text-amber-300" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-violet-300">
                  Super Admin
                </span>
              </>
            ) : (
              <AdminLogo size="lg" />
            )}
          </div>

          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            {isSuperAdmin && superView === "operations" ? (
              <>
                <button
                  type="button"
                  onClick={backToSuperRoot}
                  className="w-full flex items-center gap-2 px-3 py-2 mb-3 rounded-lg text-violet-300 hover:bg-white/5 text-sm font-medium"
                >
                  <ChevronLeft size={18} />
                  Back to Command Center
                </button>
                <p
                  className={`text-xs font-bold uppercase tracking-wider mb-3 px-3 flex items-center gap-2 ${theme.sidebarLabel}`}
                >
                  <LayoutGrid size={14} />
                  Platform Operations
                </p>
                <ul className="space-y-1">
                  {OPERATIONS_MENU_ITEMS.map((item) => (
                    <NavButton
                      key={item.id}
                      item={item}
                      isActive={activeSection === item.id}
                      badgeCount={item.badgeKey ? badges[item.badgeKey] : 0}
                      theme={theme}
                      isSuperAdmin={isSuperAdmin}
                      onClick={() => goToSection(item.id, item.badgeKey)}
                    />
                  ))}
                </ul>
              </>
            ) : isSuperAdmin ? (
              <>
                <p
                  className={`text-xs font-bold uppercase tracking-wider mb-3 px-3 ${theme.sidebarLabel}`}
                >
                  Command Center
                </p>
                <ul className="space-y-1">
                  {SUPER_ADMIN_ROOT_ITEMS.map((item) => {
                    if (item.isOperationsHub) {
                      return (
                        <NavButton
                          key={item.id}
                          item={item}
                          isActive={hubActive}
                          badgeCount={operationsBadgeTotal}
                          theme={theme}
                          isSuperAdmin={isSuperAdmin}
                          onClick={openOperationsHub}
                        />
                      );
                    }
                    return (
                      <NavButton
                        key={item.id}
                        item={item}
                        isActive={activeSection === item.id}
                        badgeCount={item.badgeKey ? badges[item.badgeKey] : 0}
                        theme={theme}
                        isSuperAdmin={isSuperAdmin}
                        onClick={() => goToSection(item.id, item.badgeKey)}
                      />
                    );
                  })}
                </ul>
              </>
            ) : (
              <>
                <p
                  className={`text-xs font-bold uppercase tracking-wider mb-3 px-3 ${theme.sidebarLabel}`}
                >
                  Menu
                </p>
                <ul className="space-y-1">
                  {ADMIN_MENU_ITEMS.map((item) => (
                    <NavButton
                      key={item.id}
                      item={item}
                      isActive={activeSection === item.id}
                      badgeCount={item.badgeKey ? badges[item.badgeKey] : 0}
                      theme={theme}
                      isSuperAdmin={false}
                      onClick={() => goToSection(item.id, item.badgeKey)}
                    />
                  ))}
                </ul>
              </>
            )}
          </nav>

          <div
            className={`p-4 border-t flex justify-center ${
              isSuperAdmin ? "border-violet-800/40" : "border-orange-200"
            }`}
          >
            {!isSuperAdmin && <AdminLogo size="sm" />}
          </div>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div
          className={`fixed inset-0 z-30 backdrop-blur-sm lg:hidden ${
            isSuperAdmin ? "bg-black/50" : "bg-orange-900/20"
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
          role="presentation"
        />
      )}
    </>
  );
}
