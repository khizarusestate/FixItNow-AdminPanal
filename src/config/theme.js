/** Panel accent tokens — warm admin vs cyan super admin. */

export const ADMIN_THEME = {
  id: "admin",
  label: "Admin",
  loginTitle: "Admin Portal",
  loginSubtitle: "Operations dashboard for platform admins",
  pageBg: "admin-shell",
  cardBorder: "border-[var(--border)]",
  primary: "bg-[var(--accent)] hover:brightness-110 text-[var(--accent-fg)]",
  primaryRing: "focus:ring-[var(--accent)] border-[var(--accent)]",
  accentText: "text-[var(--accent)]",
  mutedText: "text-[var(--text-muted)]",
  sidebar: "admin-sidebar",
  sidebarLabel: "text-[var(--text-faint)]",
  navActive: "admin-nav-active",
  navIdle: "admin-nav-idle",
  navIconBg: "bg-[var(--accent-soft)]",
  navIcon: "text-[var(--accent)]",
  topBar: "admin-topbar",
  chip: "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-soft-border)]",
  fab: "bg-[var(--accent)]",
};

export const SUPER_ADMIN_THEME = {
  id: "super_admin",
  label: "Super Admin",
  loginTitle: "Super Admin Command",
  loginSubtitle: "Full platform control & admin team management",
  pageBg: "admin-shell",
  cardBorder: "border-[var(--border)]",
  primary: "bg-[var(--accent)] hover:brightness-110 text-[var(--accent-fg)]",
  primaryRing: "focus:ring-[var(--accent)] border-[var(--accent)]",
  accentText: "text-[var(--accent)]",
  mutedText: "text-[var(--text-muted)]",
  sidebar: "admin-sidebar",
  sidebarLabel: "text-[var(--text-faint)]",
  navActive: "admin-nav-active",
  navIdle: "admin-nav-idle",
  navIconBg: "bg-[var(--accent-soft)]",
  navIcon: "text-[var(--accent)]",
  topBar: "admin-topbar",
  chip: "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-soft-border)]",
  fab: "bg-[var(--accent)]",
};

export function getTheme(isSuperAdmin) {
  return isSuperAdmin ? SUPER_ADMIN_THEME : ADMIN_THEME;
}
