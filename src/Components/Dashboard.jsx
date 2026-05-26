import { ArrowRight, ClipboardList } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { apiRequest } from "../lib/api";
import { getCachedAdminSummary } from "../utils/adminBootstrap";
import { useRefresh } from "../context/SocketContext";
import { ADMIN_MENU_ITEMS } from "../config/navigation";

export default function Dashboard({ onNavigate }) {
  const [summary, setSummary] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    totalWorkers: 0,
    pendingWorkers: 0,
    totalCustomers: 0,
    services: 0,
    revenue: 0,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!getCachedAdminSummary());

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiRequest("/admin/summary");
      setSummary(response.data || {});
      setError("");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = getCachedAdminSummary();
    if (cached) {
      setSummary(cached);
      setLoading(false);
    }
    fetchSummary();
  }, [fetchSummary]);

  useRefresh("all", fetchSummary);

  const quickStats = [
    {
      label: "Pending bookings",
      value: summary.pendingBookings || 0,
      action: () => onNavigate?.("bookings"),
    },
    {
      label: "Worker approvals",
      value: summary.pendingWorkers || 0,
      action: () => onNavigate?.("workers"),
    },
    {
      label: "Revenue",
      value: `₨${(summary.revenue || 0).toLocaleString()}`,
      action: () => onNavigate?.("revenue"),
    },
  ];

  const navItems = ADMIN_MENU_ITEMS.filter((item) => item.id !== "dashboard");
  const hasPending =
    (summary.pendingBookings || 0) > 0 || (summary.pendingWorkers || 0) > 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {quickStats.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.action}
            className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:shadow-md hover:border-orange-200 transition-all"
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {loading ? "—" : item.value}
            </p>
          </button>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">
          Quick access
        </h2>
        <p className="text-sm text-slate-500 mb-3">
          Open any module to manage your platform
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const countHint =
              item.id === "bookings"
                ? summary.totalBookings
                : item.id === "workers"
                  ? summary.totalWorkers
                  : item.id === "customers"
                    ? summary.totalCustomers
                    : item.id === "services"
                      ? summary.services
                      : null;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate?.(item.id)}
                className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-orange-200 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 group-hover:bg-orange-100 transition-colors">
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{item.label}</p>
                    {countHint != null && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {countHint} total
                      </p>
                    )}
                  </div>
                </div>
                <ArrowRight
                  size={18}
                  className="text-slate-300 group-hover:text-orange-500 shrink-0"
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-500 to-orange-600 p-5 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <ClipboardList size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Action queue</h2>
            <p className="text-sm text-orange-100 mt-0.5">
              Items waiting for your review
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3">
            <span className="text-sm">Pending bookings</span>
            <span className="text-xl font-bold">
              {summary.pendingBookings || 0}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3">
            <span className="text-sm">Workers awaiting approval</span>
            <span className="text-xl font-bold">
              {summary.pendingWorkers || 0}
            </span>
          </div>
        </div>
        {hasPending && (
          <button
            type="button"
            onClick={() =>
              onNavigate?.(
                summary.pendingBookings > 0 ? "bookings" : "workers",
              )
            }
            className="mt-4 w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors"
          >
            Review pending items
          </button>
        )}
      </div>
    </div>
  );
}
