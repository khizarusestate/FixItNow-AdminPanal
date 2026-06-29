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
        {quickStats.map((item, idx) => {
          const colorSchemes = [
            {
              bg: "bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-50",
              border: "border-blue-300 hover:border-blue-400 hover:shadow-blue-200",
              text: "from-blue-600 via-cyan-500 to-blue-600",
              label: "text-slate-700",
            },
            {
              bg: "bg-gradient-to-br from-pink-50 via-rose-100 to-pink-50",
              border: "border-pink-300 hover:border-pink-400 hover:shadow-pink-200",
              text: "from-pink-600 via-rose-500 to-pink-600",
              label: "text-slate-700",
            },
            {
              bg: "bg-gradient-to-br from-emerald-50 via-green-100 to-emerald-50",
              border: "border-emerald-300 hover:border-emerald-400 hover:shadow-emerald-200",
              text: "from-emerald-600 via-green-500 to-emerald-600",
              label: "text-slate-700",
            },
          ];
          
          const scheme = colorSchemes[idx % 3];
          
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              className={`rounded-2xl border-2 ${scheme.border} ${scheme.bg} p-6 text-left shadow-md hover:shadow-xl transition-all transform hover:scale-105`}
            >
              <p className={`text-sm font-semibold ${scheme.label}`}>{item.label}</p>
              <p className={`mt-3 text-4xl font-bold bg-gradient-to-r ${scheme.text} bg-clip-text text-transparent`}>
                {loading ? "—" : item.value}
              </p>
            </button>
          );
        })}
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
                className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm hover:shadow-lg transition-all text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2.5 rounded-xl group-hover:scale-110 transition-transform ${
                    item.id === 'bookings' ? 'bg-purple-100 text-purple-600 group-hover:bg-purple-200' :
                    item.id === 'workers' ? 'bg-cyan-100 text-cyan-600 group-hover:bg-cyan-200' :
                    item.id === 'customers' ? 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200' :
                    item.id === 'services' ? 'bg-rose-100 text-rose-600 group-hover:bg-rose-200' :
                    item.id === 'team' ? 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200' :
                    'bg-blue-100 text-blue-600 group-hover:bg-blue-200'
                  }`}>
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
                  className={`shrink-0 group-hover:translate-x-1 transition-all ${
                    item.id === 'bookings' ? 'text-purple-400 group-hover:text-purple-600' :
                    item.id === 'workers' ? 'text-cyan-400 group-hover:text-cyan-600' :
                    item.id === 'customers' ? 'text-emerald-400 group-hover:text-emerald-600' :
                    item.id === 'services' ? 'text-rose-400 group-hover:text-rose-600' :
                    item.id === 'team' ? 'text-indigo-400 group-hover:text-indigo-600' :
                    'text-slate-300 group-hover:text-blue-500'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border-0 bg-gradient-to-br from-blue-500 via-pink-500 to-emerald-500 p-6 text-white shadow-2xl hover:shadow-blue-300 transition-all">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white/25 backdrop-blur-sm rounded-xl">
            <ClipboardList size={22} />
          </div>
          <div>
            <h2 className="font-bold text-xl">Action Queue</h2>
            <p className="text-sm text-white/90 mt-0.5">
              High-priority items awaiting your attention
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl bg-white/30 backdrop-blur-sm px-4 py-3 hover:bg-white/40 transition-colors border border-white/20 font-semibold">
            <span className="text-sm">Pending bookings</span>
            <span className="text-2xl font-bold">
              {summary.pendingBookings || 0}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/30 backdrop-blur-sm px-4 py-3 hover:bg-white/40 transition-colors border border-white/20 font-semibold">
            <span className="text-sm">Workers awaiting approval</span>
            <span className="text-2xl font-bold">
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
            className="mt-4 w-full rounded-lg bg-white text-sm font-bold py-3 shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all text-transparent bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text hover:from-blue-700 hover:to-pink-700"
          >
            Review Action Items
          </button>
        )}
      </div>
    </div>
  );
}
