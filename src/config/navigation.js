import {
  Home,
  Calendar,
  Users,
  UserCheck,
  Wrench,
  DollarSign,
  Megaphone,
  Star,
  ShieldCheck,
  LayoutGrid,
  UserCog,
} from "lucide-react";

/** Full menu for regular admins */
export const ADMIN_MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: Home, badgeKey: null },
  { id: "bookings", label: "Bookings", icon: Calendar, badgeKey: "bookings" },
  { id: "workers", label: "Workers", icon: UserCheck, badgeKey: "workers" },
  { id: "customers", label: "Customers", icon: Users, badgeKey: "customers" },
  { id: "services", label: "Services", icon: Wrench, badgeKey: null },
  {
    id: "advertisements",
    label: "Advertisements",
    icon: Megaphone,
    badgeKey: "advertisements",
  },
  { id: "reviews", label: "Reviews", icon: Star, badgeKey: "reviews" },
  { id: "revenue", label: "Revenue", icon: DollarSign, badgeKey: null },
];

/** Super admin — top-level sidebar (3 items) */
export const SUPER_ADMIN_ROOT_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: Home, badgeKey: null },
  {
    id: "operations-hub",
    label: "Platform Operations",
    icon: LayoutGrid,
    badgeKey: null,
    isOperationsHub: true,
  },
  { id: "team", label: "Admin Accounts", icon: UserCog, badgeKey: null },
  {
    id: "admins-activity",
    label: "Audit Log",
    icon: Users,
    badgeKey: null,
  },
];

/** Shown under Platform Operations for super admin */
export const OPERATIONS_MENU_ITEMS = [...ADMIN_MENU_ITEMS].filter(
  (item) => item.id !== "dashboard",
);

export const OPERATIONS_SECTION_IDS = OPERATIONS_MENU_ITEMS.map(
  (item) => item.id,
);

export function isOperationsSection(sectionId) {
  return OPERATIONS_SECTION_IDS.includes(sectionId);
}

export const SECTION_TITLES = {
  ...Object.fromEntries(ADMIN_MENU_ITEMS.map((item) => [item.id, item.label])),
  ...Object.fromEntries(
    SUPER_ADMIN_ROOT_ITEMS.map((item) => [item.id, item.label]),
  ),
  profile: "Profile & Settings",
  team: "Admin Accounts",
  "operations-hub": "Platform Operations",
};

export function getPageTitle(activeSection, isSuperAdmin) {
  if (activeSection === "profile") return SECTION_TITLES.profile;
  if (isSuperAdmin && isOperationsSection(activeSection)) {
    return SECTION_TITLES[activeSection] || "Platform Operations";
  }
  return SECTION_TITLES[activeSection] || "Dashboard";
}
