import { useCallback, useEffect, useState } from "react";
import { Bell, ChevronDown, LogOut, User, X, AlertTriangle } from "lucide-react";
import { apiRequest, clearAdminToken } from "../lib/api";
import { useAdmin } from "../context/AdminContext";
import { resolveMediaUrl } from "../lib/media";
import { useSocket } from "../context/SocketContext";
import { getPageTitle, isOperationsSection } from "../config/navigation";
import { getTheme } from "../config/theme";

export default function AdminTopBar({
  activeSection,
  onNavigate,
  onLogout,
  onOpenProfileSettings,
}) {
  const { admin, refreshAdmin, isSuperAdmin } = useAdmin();
  const theme = getTheme(isSuperAdmin);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { badges, clearAllBadges } = useSocket();

  const totalBadges = Object.values(badges).reduce((a, b) => a + b, 0);
  const title = getPageTitle(activeSection, isSuperAdmin);

  useEffect(() => {
    refreshAdmin();
    const onProfileUpdated = () => refreshAdmin();
    window.addEventListener("admin-profile-updated", onProfileUpdated);
    return () =>
      window.removeEventListener("admin-profile-updated", onProfileUpdated);
  }, [refreshAdmin]);

  const handleLogout = () => {
    clearAdminToken();
    onLogout?.();
    window.location.reload();
  };

  const getInitials = (name) => {
    if (!name) return "A";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotificationsError("");
    try {
      const res = await apiRequest("/notifications?limit=20");
      setNotifications(res.data || []);
      setUnreadNotifications(res.unreadCount ?? 0);
    } catch (err) {
      setNotificationsError(err?.message || "Unable to load notifications.");
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const markAllNotificationsRead = async () => {
    try {
      await apiRequest("/notifications/read-all", { method: "PATCH" });
      setUnreadNotifications(0);
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true })),
      );
      clearAllBadges();
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!showNotifications) return;
    loadNotifications();
    clearAllBadges();
  }, [showNotifications, loadNotifications, clearAllBadges]);

  useEffect(() => {
    const onNotificationNew = () => {
      setUnreadNotifications((count) => Math.min(count + 1, 99));
      if (showNotifications) {
        loadNotifications();
      }
    };

    window.addEventListener("admin-notification-new", onNotificationNew);
    return () =>
      window.removeEventListener("admin-notification-new", onNotificationNew);
  }, [showNotifications, loadNotifications]);

  return (
    <>
      <div
        className={`sticky top-0 z-20 border-b backdrop-blur-sm px-6 py-4 ${theme.topBar}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className={`text-2xl font-bold truncate ${theme.headingText}`}>
              {title}
            </h1>
            {activeSection === "dashboard" && (
              <p className={`text-sm mt-0.5 ${theme.topBarSubtext}`}>
                {isSuperAdmin
                  ? "Command center — full platform oversight"
                  : "Platform overview and module shortcuts"}
              </p>
            )}
            {isSuperAdmin && isOperationsSection(activeSection) && (
              <p className={`text-sm mt-0.5 ${theme.topBarSubtext}`}>
                Platform Operations — same tools your admins use
              </p>
            )}
            {isSuperAdmin && activeSection === "team" && (
              <p className={`text-sm mt-0.5 ${theme.topBarSubtext}`}>
                Create and manage admin team accounts
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative h-10 w-10 flex items-center justify-center rounded-xl transition-colors ${theme.iconButton}`}
              title={`${unreadNotifications > 0 ? unreadNotifications : totalBadges} new notifications`}
            >
              <Bell
                size={18}
                className={theme.iconButtonText}
              />
              {(unreadNotifications > 0 || totalBadges > 0) && (
                <span
                  className={`absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full text-[10px] font-bold text-white px-1 ${theme.badge}`}
                >
                  {unreadNotifications > 0
                    ? unreadNotifications > 9
                      ? "9+"
                      : unreadNotifications
                    : totalBadges > 9
                      ? "9+"
                      : totalBadges}
                </span>
              )}
            </button>

            {/* Maintenance Mode Button (Super Admin Only) */}
            {isSuperAdmin && (
              <button
                onClick={() => onNavigate?.("settings")}
                className={`relative h-10 w-10 flex items-center justify-center rounded-xl transition-colors ${theme.iconButton} hover:bg-blue-100/20`}
                title="Maintenance Mode Settings"
              >
                <AlertTriangle
                  size={18}
                  className="text-blue-500"
                />
              </button>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl transition-colors ${theme.iconButton}`}
              >
                {resolveMediaUrl(admin?.profilePicture) ? (
                  <img
                    src={resolveMediaUrl(admin.profilePicture)}
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    alt={admin?.name || "Admin"}
                    className={`h-8 w-8 rounded-full object-cover border-2 ${theme.avatarBorder}`}
                  />
                ) : (
                  <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${theme.avatarGradient} flex items-center justify-center`}>
                    <span className="text-white font-semibold text-sm">
                      {getInitials(admin?.name)}
                    </span>
                  </div>
                )}
                <ChevronDown
                  size={16}
                  className={`hidden sm:block ${theme.iconButtonText}`}
                />
              </button>

              {showDropdown && (
                <div className={`absolute right-0 mt-2 w-56 rounded-xl shadow-xl py-2 z-50 ${theme.dropdown}`}>
                  <div className={`px-4 py-3 border-b ${theme.dropdownBorder}`}>
                    <p className={`font-semibold ${theme.dropdownText}`}>
                      {admin?.name || "Admin"}
                    </p>
                    <p className={`text-xs truncate ${theme.dropdownMuted}`}>
                      {admin?.email || "admin@email.com"}
                    </p>
                    {isSuperAdmin && (
                      <span className={`inline-flex mt-1 items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${theme.chip}`}>
                        Super Admin
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenProfileSettings?.();
                      setShowDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${theme.dropdownText} ${theme.dropdownHover}`}
                  >
                    <User size={16} className={theme.iconButtonText} />
                    Profile &amp; Settings
                  </button>
                  <div className={`border-t mt-1 pt-1 ${theme.dropdownBorder}`}>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showNotifications && (
        <div className="fixed top-16 right-6 w-80 bg-white rounded-xl shadow-xl border border-blue-100 z-50 overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-blue-100">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {(unreadNotifications > 0 || totalBadges > 0) && (
                <button
                  type="button"
                  onClick={async () => {
                    await markAllNotificationsRead();
                    setShowNotifications(false);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="p-4">
            {notificationsLoading ? (
              <p className="text-slate-500 text-center py-4 text-sm">
                Loading notifications…
              </p>
            ) : notificationsError ? (
              <p className="text-red-600 text-center py-4 text-sm">
                {notificationsError}
              </p>
            ) : null}

            {!notificationsLoading && notifications.length > 0 && (
              <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
                {notifications.map((item) => (
                  <div
                    key={item._id || item.id}
                    className={`rounded-lg p-3 text-sm ${
                      item.isRead
                        ? "bg-slate-50 text-slate-600"
                        : "bg-blue-50 text-slate-800"
                    }`}
                  >
                    <p className="font-medium">
                      {item.title || item.type || "Notification"}
                    </p>
                    {(item.message || item.body) && (
                      <p className="mt-1 text-xs text-slate-600">
                        {item.message || item.body}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {totalBadges > 0 ? (
              <div className="space-y-2">
                {badges.bookings > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate?.("bookings");
                      setShowNotifications(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-blue-50 rounded-lg text-left hover:bg-blue-100"
                  >
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    <p className="text-sm text-slate-700">
                      {badges.bookings} new booking(s)
                    </p>
                  </button>
                )}
                {badges.workers > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate?.("workers");
                      setShowNotifications(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-green-50 rounded-lg text-left hover:bg-green-100"
                  >
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <p className="text-sm text-slate-700">
                      {badges.workers} new worker(s)
                    </p>
                  </button>
                )}
                {badges.customers > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate?.("customers");
                      setShowNotifications(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-purple-50 rounded-lg text-left hover:bg-purple-100"
                  >
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    <p className="text-sm text-slate-700">
                      {badges.customers} new customer(s)
                    </p>
                  </button>
                )}
              </div>
            ) : !notificationsLoading &&
              !notificationsError &&
              notifications.length === 0 ? (
              <p className="text-slate-500 text-center py-4">
                No new notifications
              </p>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
