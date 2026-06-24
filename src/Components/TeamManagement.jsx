import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  UserPlus,
  Mail,
  Phone,
  User,
  Loader2,
  Wifi,
  WifiOff,
  Pencil,
  X,
  Crown,
  Users,
  Trash2,
  Eye,
  MoreVertical,
  CircleDot,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import { useAdmin } from "../context/AdminContext";
import { getTheme } from "../config/theme";
import {
  ADMIN_STATUS,
  ADMIN_STATUS_SORT_ORDER,
  getAdminStatusLine,
  getAdminStatusMeta,
} from "../utils/adminStatus";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  pin: "",
  role: "admin",
};

const EMPTY_STATS = { total: 0, online: 0, offline: 0, active: 0, inactive: 0 };

export default function TeamManagement() {
  const { admin: currentAdmin, isSuperAdmin } = useAdmin();
  const theme = getTheme(isSuperAdmin);
  const [admins, setAdmins] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  const fetchTeam = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await apiRequest("/admin/team");
      setAdmins(
        (res.data || []).map((member) => ({
          ...member,
          id: String(member.id || member._id || ""),
          _id: String(member._id || member.id || ""),
        })),
      );
      setStats({ ...EMPTY_STATS, ...(res.stats || {}) });
    } catch (err) {
      setError(err.message || "Failed to load team");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) fetchTeam();
  }, [isSuperAdmin, fetchTeam]);

  useEffect(() => {
    const onTeamUpdated = () => fetchTeam();
    const onRefresh = () => fetchTeam();
    window.addEventListener("admin-team-updated", onTeamUpdated);
    window.addEventListener("admin-refresh", onRefresh);
    return () => {
      window.removeEventListener("admin-team-updated", onTeamUpdated);
      window.removeEventListener("admin-refresh", onRefresh);
    };
  }, [fetchTeam]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal("create");
    setSuccess("");
    setError("");
  };

  const openEdit = (member) => {
    setForm({
      name: member.name,
      email: member.email,
      phone: member.phone,
      pin: "",
      role: member.role,
    });
    setModal({ type: "edit", id: member.id });
    setSuccess("");
    setError("");
  };

  const closeModal = () => {
    setModal(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (modal === "create") {
        await apiRequest("/admin/team", {
          method: "POST",
          body: JSON.stringify(form),
        });
        setSuccess("New admin added successfully.");
      } else if (modal?.type === "edit") {
        const body = {
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
        };
        if (form.pin) body.pin = form.pin;
        await apiRequest(`/admin/team/${modal.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        setSuccess("Admin updated successfully.");
      }
      closeModal();
      await fetchTeam();
    } catch (err) {
      setError(err.message || "Action failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (member) => {
    if (String(member.id) === String(currentAdmin?.id)) {
      setError("You cannot set your own account to Inactive.");
      return;
    }
    const makeActive = member.status === ADMIN_STATUS.INACTIVE;
    try {
      setError("");
      await apiRequest(`/admin/team/${member.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: makeActive }),
      });
      setSuccess(
        makeActive
          ? `${member.name} is now Active.`
          : `${member.name} is now Inactive and signed out on all devices.`,
      );
      await fetchTeam();
    } catch (err) {
      setError(err.message || "Could not update status");
    }
  };

  const sortedAdmins = [...admins].sort((a, b) => {
    const aOrder = ADMIN_STATUS_SORT_ORDER[a?.status] ?? 3;
    const bOrder = ADMIN_STATUS_SORT_ORDER[b?.status] ?? 3;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const aTime = new Date(a?.lastLogin || a?.updatedAt || a?.createdAt || 0).getTime();
    const bTime = new Date(b?.lastLogin || b?.updatedAt || b?.createdAt || 0).getTime();
    return bTime - aTime;
  });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (String(deleteTarget.id) === String(currentAdmin?.id)) {
      setError("You cannot delete your own account.");
      setDeleteTarget(null);
      return;
    }
    try {
      setError("");
      await apiRequest(`/admin/team/${deleteTarget.id}`, { method: "DELETE" });
      setSuccess(`${deleteTarget.name} was permanently deleted.`);
      setDeleteTarget(null);
      await fetchTeam();
    } catch (err) {
      setError(err.message || "Could not delete admin");
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <Shield className="mx-auto h-12 w-12 text-amber-500 mb-3" />
        <h2 className="text-lg font-semibold text-slate-900">
          Super admin only
        </h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
          Managing admin accounts requires super admin access. Contact your
          platform owner if you need help.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className={theme.accentText} size={22} />
            Admin Accounts
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Online, Offline, and Active admins — Inactive when disabled
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition ${theme.primary}`}
        >
          <UserPlus size={18} />
          Add Admin
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Online",
            value: stats.online,
            icon: Wifi,
            color: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Offline",
            value: stats.offline,
            icon: WifiOff,
            color: "bg-slate-100 text-slate-600",
          },
          {
            label: "Active",
            value: stats.active,
            icon: CircleDot,
            color: "bg-blue-50 text-blue-600",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-4 shadow-sm"
          >
            <div className={`p-3 rounded-xl ${card.color}`}>
              <card.icon size={22} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                {card.label}
              </p>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {stats.inactive > 0 && (
        <p className="text-sm text-slate-500">
          {stats.inactive} admin{stats.inactive === 1 ? "" : "s"} currently Inactive.
        </p>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-16 text-slate-500 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="animate-spin mr-2" size={22} />
            Loading team...
          </div>
        ) : admins.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            No admins found.
          </div>
        ) : (
          sortedAdmins.map((member) => {
            const memberId = String(member.id || member._id || "");
            const isSelf = memberId === String(currentAdmin?.id || "");
            const isSuperRow = member.role === "super_admin";
            const statusMeta = getAdminStatusMeta(member.status);
            return (
              <div
                key={memberId}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5"
              >
                <div className="flex items-start gap-3">
                  <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${theme.avatarGradient} flex items-center justify-center text-white font-semibold shrink-0`}>
                    {(member.name || "A").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">
                      {member.name}
                      {isSelf && (
                        <span className={`ml-2 text-[10px] font-bold uppercase ${theme.accentText} ${theme.chip} px-1.5 py-0.5 rounded`}>
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slate-500 truncate">{member.email}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {member.role === "super_admin" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-800 px-2.5 py-1 text-xs font-semibold">
                          <Crown size={12} />
                          Super Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-xs font-semibold">
                          <Shield size={12} />
                          Admin
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={`mt-4 rounded-lg px-3 py-2 text-sm ${statusMeta.wrap}`}
                >
                  <p className="font-semibold inline-flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${statusMeta.dot}`}
                    />
                    {getAdminStatusLine(member)}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewTarget(member)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                  >
                    <Eye size={16} />
                  </button>

                  {!isSelf && !isSuperRow && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenActionMenuId((prev) =>
                            prev === memberId ? null : memberId,
                          )
                        }
                        className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                        title="More actions"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openActionMenuId === memberId && (
                        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white shadow-lg z-10">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionMenuId(null);
                              openEdit(member);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionMenuId(null);
                              toggleActive(member);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                          >
                            {member.status === ADMIN_STATUS.INACTIVE
                              ? "Set Active"
                              : "Set Inactive"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionMenuId(null);
                              setDeleteTarget(member);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-red-200 p-6">
            <h3 className="text-lg font-bold text-slate-900">
              Delete admin account?
            </h3>
            <p className="text-sm text-slate-600 mt-2">
              <strong>{deleteTarget.name}</strong> ({deleteTarget.email}) will
              be removed permanently. They will be signed out immediately on all
              devices.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {viewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Admin details</h3>
              <button
                type="button"
                onClick={() => setViewTarget(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${theme.avatarGradient} flex items-center justify-center text-white font-semibold`}>
                  {(viewTarget.name || "A").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{viewTarget.name}</p>
                  <p className="text-sm text-slate-500">{viewTarget.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="font-medium text-slate-800">{viewTarget.phone || "N/A"}</p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Role</p>
                  <p className="font-medium text-slate-800 capitalize">
                    {viewTarget.role === "super_admin" ? "Super Admin" : "Admin"}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 col-span-2">
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="font-medium text-slate-800">
                    {(() => {
                      const meta = getAdminStatusMeta(viewTarget.status);
                      return (
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${meta.dot}`}
                          />
                          {getAdminStatusLine(viewTarget)}
                        </span>
                      );
                    })()}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 col-span-2">
                  <p className="text-xs text-slate-500">Last Login</p>
                  <p className="font-medium text-slate-800">
                    {viewTarget.lastLogin
                      ? new Date(viewTarget.lastLogin).toLocaleString()
                      : "Never"}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 col-span-2">
                  <p className="text-xs text-slate-500">Location</p>
                  <p className="font-medium text-slate-800">
                    {viewTarget.location || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">
                {modal === "create" ? "Add new admin" : "Edit admin"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full name
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone
                </label>
                <div className="relative">
                  <Phone
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    required
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {modal === "create"
                    ? "8-digit PIN"
                    : "New PIN (leave blank to keep)"}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  required={modal === "create"}
                  value={form.pin}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pin: e.target.value.replace(/\D/g, "").slice(0, 8),
                    })
                  }
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 tracking-widest"
                />
              </div>
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                New accounts start as <strong>Active</strong>. Super Admin is a
                single owner account configured on the server.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`flex-1 py-2.5 rounded-lg text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2 ${theme.primarySolid}`}
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {modal === "create" ? "Create" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
