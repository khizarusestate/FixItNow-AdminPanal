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
  pageBg: "bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900",
  cardBorder: "border-violet-500/40",
  cardGlow: "shadow-violet-500/20 shadow-2xl",
  primary: "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500",
  primaryRing: "focus:ring-violet-500 border-violet-500",
  accentText: "text-violet-300",
  mutedText: "text-violet-400/80",
  sidebar: "from-slate-900 via-violet-950 to-slate-900 border-violet-800/50",
  sidebarLabel: "text-violet-400",
  navActive: "from-violet-600 to-indigo-600 shadow-violet-900/50",
  navIdle: "text-violet-200 hover:bg-white/5",
  navIconBg: "bg-violet-900/60 group-hover:bg-violet-800/80",
  navIcon: "text-violet-300",
  topBar: "border-violet-900/50 bg-slate-900/90 text-white",
  chip: "bg-violet-500/20 text-violet-200 border border-violet-500/30",
  fab: "from-violet-600 to-indigo-600",
};

export function getTheme(isSuperAdmin) {
  return isSuperAdmin ? SUPER_ADMIN_THEME : ADMIN_THEME;
}
