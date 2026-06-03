import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { Loader2, RefreshCw, ScrollText } from "lucide-react";
import Pagination from "./Pagination";

const ACTION_LABELS = {
  login: "Login",
  logout: "Logout",
  worker_approve: "Worker approved",
  worker_reject: "Worker rejected",
  worker_delete: "Worker deleted",
  worker_create: "Worker created",
  worker_update: "Worker updated",
  worker_status_change: "Worker status",
  customer_delete: "Customer deleted",
  customer_update: "Customer updated",
  customer_status_change: "Customer status",
  booking_assign: "Booking assigned",
  booking_update: "Booking updated",
  booking_delete: "Booking deleted",
  service_create: "Service created",
  service_update: "Service updated",
  service_delete: "Service deleted",
  profile_update: "Profile updated",
  settings_update: "Settings updated",
  job_complete: "Job completed",
  admin_create: "Admin created",
  admin_update: "Admin updated",
  admin_delete: "Admin deleted",
};

export default function AdminsActivity() {
  const [logs, setLogs] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        ...(search && { search }),
        ...(filterAction && { action: filterAction }),
      });
      const res = await apiRequest(`/admin/audit-logs?${params}`);
      setLogs(res.data || []);
      setActions(res.actions || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterAction]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ScrollText className="text-violet-600" size={28} />
            Audit Log
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Who did what — worker, booking, and admin actions (super admin only).
          </p>
        </div>
        <button
          type="button"
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input
          type="search"
          placeholder="Search admin email or action..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 min-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <select
          value={filterAction}
          onChange={(e) => {
            setFilterAction(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a] || a}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16 text-slate-500">
            <Loader2 className="animate-spin mr-2" size={22} />
            Loading audit log...
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center py-12 text-slate-500">No audit entries found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {log.adminEmail}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-violet-100 text-violet-800 px-2 py-0.5 text-xs font-semibold">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {log.targetType}
                      {log.targetId ? (
                        <span className="block text-xs font-mono text-slate-400">
                          {String(log.targetId).slice(-8)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">
                      {log.details?.serviceTitle ||
                        log.details?.fullName ||
                        log.details?.workerName ||
                        (log.details?.auto ? "Auto-assign" : "") ||
                        "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalItems > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
