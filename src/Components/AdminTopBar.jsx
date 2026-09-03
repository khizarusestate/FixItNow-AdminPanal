import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Calendar,
  ChevronDown,
  Check,
  LogOut,
  Megaphone,
  Settings,
  Star,
  Trash2,
  User,
  UserCheck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { apiRequest, clearAdminToken } from "../lib/api";
import { useAdmin } from "../context/AdminContext";
import { resolveMediaUrl } from "../lib/media";
import { useSocket } from "../context/SocketContext";
import { getPageTitle, isOperationsSection } from "../config/navigation";
import { getTheme } from "../config/theme";
import SupportHeaderButton from "./SupportHeaderButton";

const NOTIFICATION_SECTION_MAP = {
  new_booking: "bookings",
  booking: "bookings",
  booking_received: "bookings",
  claim_pending: "bookings",
  claim_approved: "bookings",
  claim_rejected: "bookings",
  worker_assigned: "bookings",
  worker_on_the_way: "bookings",
  job_completed: "bookings",
  worker_completed: "bookings",
  customer_completed: "bookings",
  new_job: "bookings",
  new_worker: "workers",
  new_customer: "customers",
  new_review: "reviews",
  new_advertisement: "advertisements",
  new_service: "services",
  services: "services",
  revenue: "revenue",
  admins: "admins-activity",
  admin_activity: "admins-activity",
  workers: "workers",
  customers: "customers",
  bookings: "bookings",
  reviews: "reviews",
  advertisements: "advertisements",
  support_chat: "support-messages",
  support_message: "support-messages",
  support_messages: "support-messages",
};

const NOTIFICATION_ICONS = {
  new_booking: Calendar,
  booking: Calendar,
  booking_received: Calendar,
  claim_pending: Calendar,
  claim_approved: Check,
  claim_rejected: X,
  worker_assigned: UserCheck,
  worker_on_the_way: UserCheck,
  job_completed: Check,
  worker_completed: Check,
  customer_completed: Check,
  new_job: Calendar,
  new_worker: UserCheck,
  new_customer: Users,
  new_review: Star,
  new_advertisement: Megaphone,
  new_service: Wrench,
  services: Wrench,
  revenue: Calendar,
  admins: Users,
  admin_activity: Users,
  workers: UserCheck,
  customers: Users,
  bookings: Calendar,
  reviews: Star,
  advertisements: Megaphone,
  support_chat: Users,
  support_message: Users,
  support_messages: Users,
};

function getNotificationSection(notification) {
  const type = String(notification?.type || "").trim().toLowerCase();
  const explicitSection = String(notification?.sectionType || "").trim().toLowerCase();
  const section = NOTIFICATION_SECTION_MAP[type];
  const explicitMappedSection = NOTIFICATION_SECTION_MAP[explicitSection];

  // Only use sectionType directly when it is an actual admin section id.
  // This prevents arbitrary notification types from overriding the reliable type map.
  const validSections = new Set([
    "bookings",
    "workers",
    "customers",
    "services",
    "revenue",
    "advertisements",
    "reviews",
    "support-messages",
    "admins-activity",
  ]);

  if (explicitMappedSection) return explicitMappedSection;
  if (validSections.has(explicitSection)) return explicitSection;
  if (section) return section;
  return null;
}

function getNotificationIcon(type) {
  return NOTIFICATION_ICONS[String(type || "").toLowerCase()] || Bell;
}

function formatRelativeTime(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diff = Math.max(0, Date.now() - date.getTime());
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString("en-PK", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function formatNotificationType(type) {
  return String(type || "notification")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AdminTopBar({ activeSection, onNavigate, onLogout, onOpenProfileSettings }) {
  const { admin, refreshAdmin, isSuperAdmin } = useAdmin();
  const theme = getTheme(isSuperAdmin);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { clearAllBadges } = useSocket();
  const title = getPageTitle(activeSection, isSuperAdmin);

  useEffect(() => {
    refreshAdmin();
    const onProfileUpdated = () => refreshAdmin();
    window.addEventListener("admin-profile-updated", onProfileUpdated);
    return () => window.removeEventListener("admin-profile-updated", onProfileUpdated);
  }, [refreshAdmin]);

  const handleLogout = () => {
    clearAdminToken();
    onLogout?.();
    window.location.reload();
  };

  const getInitials = (name) => {
    if (!name) return "A";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
  };

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotificationsError("");
    try {
      const res = await apiRequest("/notifications?limit=20");
      setNotifications(Array.isArray(res?.data) ? res.data : []);
      setUnreadNotifications(Number(res?.unreadCount) || 0);
    } catch (err) {
      setNotificationsError(err?.message || "Unable to load notifications.");
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const markNotificationRead = async (notification) => {
    if (!notification?._id || notification.isRead) return;
    try {
      await apiRequest(`/notifications/${notification._id}/read`, { method: "PATCH" });
      setNotifications((prev) => prev.map((item) => (
        item._id === notification._id ? { ...item, isRead: true } : item
      )));
      setUnreadNotifications((count) => Math.max(0, count - 1));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllNotificationsRead = async () => {
    if (unreadNotifications <= 0) return;
    try {
      await apiRequest("/notifications/read-all", { method: "PATCH" });
      setUnreadNotifications(0);
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      clearAllBadges();
    } catch (err) {
      console.error("Error marking notifications as read:", err);
    }
  };

  const deleteNotification = async (notificationId) => {
    if (!notificationId) return;
    const target = notifications.find((item) => item._id === notificationId);
    try {
      await apiRequest(`/notifications/${notificationId}`, { method: "DELETE" });
      setNotifications((prev) => prev.filter((item) => item._id !== notificationId));
      if (target && !target.isRead) {
        setUnreadNotifications((count) => Math.max(0, count - 1));
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const handleNotificationClick = async (notification) => {
    await markNotificationRead(notification);
    const section = getNotificationSection(notification);
    if (section) onNavigate?.(section);
    setShowNotifications(false);
  };

  useEffect(() => {
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    if (!showNotifications) return;
    loadNotifications();
  }, [showNotifications, loadNotifications]);

  useEffect(() => {
    const onNotificationNew = (event) => {
      const detail = event.detail || {};
      setUnreadNotifications((count) => Math.min(count + 1, 99));

      if (detail.id && !String(detail.id).startsWith("legacy-")) {
        setNotifications((prev) => {
          const exists = prev.some((item) => String(item._id || item.id) === String(detail.id));
          if (exists) return prev;
          const liveItem = {
            _id: detail.id,
            id: detail.id,
            title: detail.title || "New notification",
            message: detail.message || detail.body || "",
            type: detail.type || detail.sectionType || "notification",
            sectionType: detail.sectionType || detail.type,
            createdAt: new Date().toISOString(),
            isRead: false,
          };
          return [liveItem, ...prev].slice(0, 20);
        });
      }
    };

    window.addEventListener("admin-notification-new", onNotificationNew);
    return () => window.removeEventListener("admin-notification-new", onNotificationNew);
  }, []);

  return (
    <>
      <div className={`sticky top-0 z-20 border-b backdrop-blur-sm px-6 py-4 ${theme.topBar}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className={`text-2xl font-bold truncate ${theme.headingText}`}>{title}</h1>
            {activeSection === "dashboard" && <p className={`text-sm mt-0.5 ${theme.topBarSubtext}`}>{isSuperAdmin ? "Command center — full platform oversight" : "Platform overview and module shortcuts"}</p>}
            {isSuperAdmin && isOperationsSection(activeSection) && <p className={`text-sm mt-0.5 ${theme.topBarSubtext}`}>Platform Operations — same tools your admins use</p>}
            {isSuperAdmin && activeSection === "team" && <p className={`text-sm mt-0.5 ${theme.topBarSubtext}`}>Create and manage admin team accounts</p>}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <SupportHeaderButton onNavigate={onNavigate} />
            <div className="relative">
              <button
                type="button"
                aria-label="Notifications"
                aria-expanded={showNotifications}
                onClick={() => { setShowNotifications((open) => !open); setShowDropdown(false); }}
                className={`relative h-10 w-10 flex items-center justify-center rounded-xl transition-all ${theme.iconButton} ${showNotifications ? "ring-2 ring-sky-200" : ""}`}
                title={unreadNotifications > 0 ? `${unreadNotifications} unread notifications` : "Notifications"}
              >
                <Bell size={18} className={theme.iconButtonText} />
                {unreadNotifications > 0 && (
                  <span className={`absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold text-white px-1 ${theme.badge}`}>
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-[-1rem] sm:right-0 mt-3 w-[calc(100vw-1rem)] max-w-[22rem] sm:w-[23rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/30 z-[55]">
                  <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-3">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">Notifications</h3>
                        {unreadNotifications > 0 && <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">{unreadNotifications} unread</span>}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">Latest activity from your FixItNow platform</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {isSuperAdmin && (
                        <button type="button" onClick={() => { setShowNotifications(false); onOpenProfileSettings?.("settings"); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Notification settings" aria-label="Notification settings">
                          <Settings size={16} />
                        </button>
                      )}
                      <button type="button" onClick={() => setShowNotifications(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Close" aria-label="Close notifications">
                        <X size={17} />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[min(28rem,65vh)] overflow-y-auto overscroll-contain">
                    {notificationsLoading && notifications.length === 0 ? (
                      <div className="px-6 py-12 text-center">
                        <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-sky-500" />
                        <p className="text-sm text-slate-500">Loading notifications…</p>
                      </div>
                    ) : notificationsError ? (
                      <div className="px-6 py-10 text-center">
                        <Bell size={28} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-medium text-slate-700">Couldn’t load notifications</p>
                        <p className="mt-1 text-xs text-slate-500">{notificationsError}</p>
                        <button type="button" onClick={loadNotifications} className="mt-4 rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100">Try again</button>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-6 py-12 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                          <Bell size={22} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800">You’re all caught up</p>
                        <p className="mt-1 text-xs text-slate-500">No notifications to show right now.</p>
                      </div>
                    ) : (
                      <div>
                        {notifications.map((item) => {
                          const Icon = getNotificationIcon(item.type);
                          const section = getNotificationSection(item);
                          return (
                            <div key={item._id || item.id} className={`group border-b border-slate-100 last:border-b-0 transition-colors ${item.isRead ? "bg-white hover:bg-slate-50" : "bg-sky-50/70 hover:bg-sky-50"}`}>
                              <div className="flex items-start gap-3 px-3.5 py-3">
                                <button type="button" onClick={() => handleNotificationClick(item)} className="flex min-w-0 flex-1 items-start gap-2.5 text-left" title={section ? "Open related section" : "Mark as read"}>
                                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.isRead ? "bg-slate-100 text-slate-500" : "bg-sky-100 text-sky-600"}`}>
                                    <Icon size={16} />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2">
                                      <span className={`truncate text-sm ${item.isRead ? "font-medium text-slate-700" : "font-semibold text-slate-900"}`}>{item.title || formatNotificationType(item.type)}</span>
                                      {!item.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />}
                                    </span>
                                    {(item.message || item.body) && <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-slate-500">{item.message || item.body}</span>}
                                    <span className="mt-1.5 block text-[11px] text-slate-400">{formatRelativeTime(item.createdAt)}</span>
                                  </span>
                                </button>
                                <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                                  {!item.isRead && item._id && (
                                    <button type="button" onClick={() => markNotificationRead(item)} className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600" title="Mark as read" aria-label="Mark as read">
                                      <Check size={15} />
                                    </button>
                                  )}
                                  {item._id && (
                                    <button type="button" onClick={() => deleteNotification(item._id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500" title="Delete notification" aria-label="Delete notification">
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-3.5 py-2.5">
                    <span className="text-[11px] text-slate-400">Showing latest {Math.min(notifications.length, 20)}</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={loadNotifications} disabled={notificationsLoading} className="text-xs font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50">Refresh</button>
                      {unreadNotifications > 0 && <button type="button" onClick={markAllNotificationsRead} className="text-xs font-semibold text-sky-600 hover:text-sky-700">Mark all read</button>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button type="button" onClick={() => { setShowDropdown(!showDropdown); setShowNotifications(false); }} className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl transition-colors ${theme.iconButton}`}>
                {resolveMediaUrl(admin?.profilePicture) ? (
                  <img src={resolveMediaUrl(admin.profilePicture)} crossOrigin="anonymous" referrerPolicy="no-referrer" alt={admin?.name || "Admin"} className={`h-8 w-8 rounded-full object-cover border-2 ${theme.avatarBorder}`} />
                ) : (
                  <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${theme.avatarGradient} flex items-center justify-center`}><span className="text-white font-semibold text-sm">{getInitials(admin?.name)}</span></div>
                )}
                <ChevronDown size={16} className={`hidden sm:block ${theme.iconButtonText}`} />
              </button>

              {showDropdown && <div className={`absolute right-0 mt-2 w-64 rounded-xl shadow-xl py-2 z-50 ${theme.dropdown}`}>
                <div className={`px-4 py-3 border-b ${theme.dropdownBorder}`}>
                  <p className={`font-semibold ${theme.dropdownText}`}>{admin?.name || "Admin"}</p>
                  <p className={`text-xs truncate ${theme.dropdownMuted}`}>{admin?.email || "admin@email.com"}</p>
                  {isSuperAdmin && <span className={`inline-flex mt-1 items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${theme.chip}`}>Super Admin</span>}
                </div>
                <button type="button" onClick={() => { onOpenProfileSettings?.("profile"); setShowDropdown(false); }} className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 ${theme.dropdownText} ${theme.dropdownHover}`}><User size={17} className={theme.iconButtonText} /><span>Profile</span></button>
                <button type="button" onClick={() => { onOpenProfileSettings?.("settings"); setShowDropdown(false); }} className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 ${theme.dropdownText} ${theme.dropdownHover}`}><Settings size={17} className={theme.iconButtonText} /><span>Settings</span></button>
                <div className={`border-t mt-1 pt-1 ${theme.dropdownBorder}`}><button type="button" onClick={handleLogout} className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"><LogOut size={17} /><span>Logout</span></button></div>
              </div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
