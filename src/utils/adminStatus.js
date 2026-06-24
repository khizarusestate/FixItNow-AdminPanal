export const ADMIN_STATUS = Object.freeze({
  ONLINE: 'online',
  OFFLINE: 'offline',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

export const ADMIN_STATUS_LABELS = Object.freeze({
  [ADMIN_STATUS.ONLINE]: 'Online',
  [ADMIN_STATUS.OFFLINE]: 'Offline',
  [ADMIN_STATUS.ACTIVE]: 'Active',
  [ADMIN_STATUS.INACTIVE]: 'Inactive',
});

export function getAdminStatusLabel(status) {
  return ADMIN_STATUS_LABELS[status] || 'Active';
}

export function getAdminStatusMeta(status) {
  switch (status) {
    case ADMIN_STATUS.ONLINE:
      return {
        label: ADMIN_STATUS_LABELS.online,
        wrap: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 shadow-sm',
        dot: 'bg-emerald-500 animate-pulse',
      };
    case ADMIN_STATUS.OFFLINE:
      return {
        label: ADMIN_STATUS_LABELS.offline,
        wrap: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
        dot: 'bg-slate-400',
      };
    case ADMIN_STATUS.INACTIVE:
      return {
        label: ADMIN_STATUS_LABELS.inactive,
        wrap: 'bg-red-50 text-red-700 ring-1 ring-red-100',
        dot: 'bg-red-500',
      };
    case ADMIN_STATUS.ACTIVE:
    default:
      return {
        label: ADMIN_STATUS_LABELS.active,
        wrap: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
        dot: 'bg-blue-500',
      };
  }
}

export function getAdminStatusLine(member) {
  const meta = getAdminStatusMeta(member?.status);
  if (member?.status === ADMIN_STATUS.OFFLINE && member?.lastLoginText) {
    return `${meta.label} (Last: ${member.lastLoginText})`;
  }
  return meta.label;
}

export function resolveLocalAdminStatus({ isActive = true, connected = false, lastLogin = null } = {}) {
  if (isActive === false) return ADMIN_STATUS.INACTIVE;
  if (connected) return ADMIN_STATUS.ONLINE;
  if (lastLogin) return ADMIN_STATUS.OFFLINE;
  return ADMIN_STATUS.ACTIVE;
}

export const ADMIN_STATUS_SORT_ORDER = {
  [ADMIN_STATUS.ONLINE]: 0,
  [ADMIN_STATUS.OFFLINE]: 1,
  [ADMIN_STATUS.ACTIVE]: 2,
  [ADMIN_STATUS.INACTIVE]: 3,
};
