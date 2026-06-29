import { Search, ArrowUpDown, Calendar, X } from "lucide-react";

export function StatCard({ title, value, icon, color = "blue", onClick, active }) {
  const colors = {
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-violet-50 text-violet-700 border-violet-200",
    red: "bg-red-50 text-red-700 border-red-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-2xl border p-4 text-left transition-all ${
        colors[color] || colors.blue
      } ${onClick ? "hover:shadow-md cursor-pointer" : "cursor-default"} ${
        active ? "ring-2 ring-blue-400 ring-offset-1" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
          {title}
        </p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </button>
  );
}

export default function ListToolbar({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
  filterStatus,
  onFilterChange,
  statusOptions = [],
  dateFrom = "",
  dateTo = "",
  onDateFromChange,
  onDateToChange,
  showDateFilter = false,
  onSort,
  sortLabel = "Date",
  onClearDates,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {statusOptions.length > 0 && (
            <select
              value={filterStatus}
              onChange={(e) => onFilterChange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100 sm:min-w-[180px]"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {showDateFilter && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 bg-slate-50">
                <Calendar size={16} className="text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onDateFromChange?.(e.target.value)}
                  className="bg-transparent text-sm outline-none"
                  aria-label="From date"
                />
                <span className="text-slate-400 text-sm">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => onDateToChange?.(e.target.value)}
                  className="bg-transparent text-sm outline-none"
                  aria-label="To date"
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={onClearDates}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <X size={14} />
                  Clear dates
                </button>
              )}
            </div>
          )}

          {onSort && (
            <button
              type="button"
              onClick={onSort}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50 transition-all"
            >
              <ArrowUpDown size={16} />
              {sortLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
