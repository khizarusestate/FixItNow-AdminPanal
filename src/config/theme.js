/** Panel accent tokens — orange (admin) vs violet (super admin). */

export const ADMIN_THEME = {
  id: "admin",
  label: "Admin",
  loginTitle: "Admin Portal",
  loginSubtitle: "Operations dashboard for platform admins",
  pageBg: "bg-slate-50",
  cardBorder: "border-orange-200",
  cardGlow: "shadow-orange-100/50",
  primary: "bg-orange-500 hover:bg-orange-600",
  primaryRing: "focus:ring-orange-500 border-orange-500",
  accentText: "text-orange-600",
  mutedText: "text-orange-400",
  sidebar: "from-orange-50 to-orange-100/50 border-orange-200",
  sidebarLabel: "text-orange-400",
  navActive: "from-orange-500 to-orange-600 shadow-orange-200",
  navIdle: "text-orange-800 hover:bg-white/60",
  navIconBg: "bg-orange-100 group-hover:bg-orange-200",
  navIcon: "text-orange-600",
  topBar: "border-orange-100 bg-white/95",
  chip: "bg-orange-100 text-orange-800",
  fab: "from-orange-500 to-orange-600",
};

export const SUPER_ADMIN_THEME = {
  id: "super_admin",
  label: "Super Admin",
  loginTitle: "Super Admin Command",
  loginSubtitle: "Full platform control & admin team management",
  pageBg: "bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950",
  cardBorder: "border-cyan-500/35",
  cardGlow: "shadow-cyan-900/30 shadow-2xl",
  primary: "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500",
  primaryRing: "focus:ring-cyan-500 border-cyan-500",
  accentText: "text-cyan-300",
  mutedText: "text-cyan-200/80",
  sidebar: "from-slate-950 via-slate-900 to-cyan-950 border-cyan-900/50",
  sidebarLabel: "text-cyan-300",
  navActive: "from-cyan-600 to-blue-600 shadow-cyan-900/50",
  navIdle: "text-cyan-100 hover:bg-white/5",
  navIconBg: "bg-cyan-900/45 group-hover:bg-cyan-800/70",
  navIcon: "text-cyan-300",
  topBar: "border-cyan-900/50 bg-slate-950/85 text-white",
  chip: "bg-cyan-500/20 text-cyan-100 border border-cyan-500/30",
  fab: "from-cyan-600 to-blue-600",
};

export function getTheme(isSuperAdmin) {
  return isSuperAdmin ? SUPER_ADMIN_THEME : ADMIN_THEME;
}
