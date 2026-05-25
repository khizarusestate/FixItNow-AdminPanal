import {
  Search,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  X,
  MapPin,
  Phone,
  Mail,
  User,
  UserCheck,
  Wrench,
  Calendar,
  FileText,
  Loader2,
  AlertCircle,
  DollarSign,
  MessageSquare,
  Trophy,
  Star,
  Receipt,
} from "lucide-react";

import { useEffect, useState, useCallback, useMemo } from "react";
import { apiRequest, paginatedRequest } from "../lib/api";
import { useRefresh, useSocket } from "../context/SocketContext";
import Pagination from "./Pagination";
import { RefreshCw } from "lucide-react";
import ListToolbar, { StatCard } from "./shared/ListToolbar";
import CompletionTicks from "./CompletionTicks";
import { resolveMediaUrl } from "../lib/media";

const ADMIN_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "pending-confirmation",
  "assigned",
  "in-progress",
  "completed",
  "cancelled",
];

const STATUS_CONFIG = {
  pending: {
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: Clock,
    label: "Pending",
  },
  approved: {
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle,
    label: "Approved",
  },
  "pending-confirmation": {
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: AlertCircle,
    label: "Pending Confirmation",
  },
  assigned: {
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: UserCheck,
    label: "Assigned",
  },
  "in-progress": {
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Loader2,
    label: "In Progress",
  },
  completed: {
    color: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle,
    label: "Done",
  },
  rejected: {
    color: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle,
    label: "Rejected",
  },
  cancelled: {
    color: "bg-slate-100 text-slate-700 border-slate-200",
    icon: XCircle,
    label: "Cancelled",
  },
};

const isAdminControlled = (status) => status === "pending";

const formatDate = (date) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (date) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getReceiptFilename = (receiptPath) => {
  if (!receiptPath) return null;
  const normalized = String(receiptPath).replace(/\\/g, "/");
  return normalized.split("/").pop() || null;
};

const getReceiptImageUrl = (receiptPath) => {
  if (!receiptPath) return null;
  const normalized = String(receiptPath).replace(/\\/g, "/");
  if (normalized.toLowerCase().includes("/uploads/")) {
    return resolveMediaUrl(normalized);
  }
  const filename = getReceiptFilename(receiptPath);
  if (!filename) return null;
  return resolveMediaUrl(`/uploads/payment-receipts/${filename}`);
};

const paymentMethodLabel = (key) => {
  const k = String(key || "").toLowerCase();
  const map = {
    easypaisa: "EasyPaisa",
    jazzcash: "JazzCash",
    "hand-to-hand": "Hand to hand",
    "pay-after-work": "Payment after work",
    "debit-card": "Debit card",
    "credit-card": "Credit card",
  };
  return map[k] || k || "—";
};

function ReceiptPreview({
  receiptPath,
  thumbClassName = "h-20 w-20",
  imgClassName,
}) {
  const url = getReceiptImageUrl(receiptPath);
  const [broken, setBroken] = useState(false);
  if (!url) return null;
  const isPdf = String(getReceiptFilename(receiptPath) || "")
    .toLowerCase()
    .endsWith(".pdf");
  if (isPdf || broken) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-emerald-300 bg-white text-emerald-700 shadow-sm ${thumbClassName}`}
        title="Open receipt"
      >
        <FileText size={28} />
      </a>
    );
  }
  const imgCls = imgClassName || "h-full w-full object-cover";
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`shrink-0 overflow-hidden rounded-md border border-emerald-300 bg-white shadow-sm ${thumbClassName}`}
      title="View full receipt"
    >
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        className={imgCls}
        onError={() => setBroken(true)}
      />
    </a>
  );
}

export default function Bookings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState("-createdAt");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    assigned: 0,
    rejected: 0,
    completed: 0,
  });

  const [viewModal, setViewModal] = useState({
    open: false,
    booking: null,
  });

  const [rankingModal, setRankingModal] = useState({
    open: false,
    booking: null,
    workers: [],
  });

  const [workerDetailsModal, setWorkerDetailsModal] = useState({
    open: false,
    worker: null,
  });

  const { clearBadge } = useSocket();

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit,
        sort,
        ...(searchTerm && { search: searchTerm }),
        ...(filterStatus !== "all" && { status: filterStatus }),
        ...(dateFrom && { startDate: dateFrom }),
        ...(dateTo && { endDate: dateTo }),
      };

      const response = await paginatedRequest("/admin/bookings", params);

      const transformedBookings = (
        response?.data?.bookings ||
        response?.data ||
        []
      ).map((booking) => ({
        id: booking?._id || crypto.randomUUID(),
        workerId: booking?.workerId?._id || booking?.workerId || null,
        worker: booking?.workerId || null,
        customer:
          booking?.customerName || booking?.customerId?.fullName || "N/A",
        email: booking?.email || booking?.customerId?.email || "N/A",
        phone: booking?.phone || booking?.customerId?.phone || "N/A",
        service:
          booking?.serviceTitle ||
          booking?.service?.title ||
          booking?.category ||
          "N/A",
        category:
          booking?.serviceCategory || booking?.category || "General Service",
        location: booking?.address || booking?.location || "N/A",
        notes: booking?.notes || "",
        price: Number(
          booking?.price || booking?.paymentDetails?.totalAmount || 0,
        ),
        customerProfilePicture: resolveMediaUrl(
          booking?.customerProfilePicture ||
            booking?.customerId?.profilePicture ||
            "",
        ),
        status: booking?.status || "pending",
        customerMarkedDone: Boolean(booking?.customerMarkedDone),
        workerMarkedDone: Boolean(booking?.workerMarkedDone),
        customerMarkedDoneAt: booking?.customerMarkedDoneAt,
        workerMarkedDoneAt: booking?.workerMarkedDoneAt,
        customerRating: booking?.customerRating,
        paymentDetails: booking?.paymentDetails || null,
        createdAt: booking?.createdAt,
        updatedAt: booking?.updatedAt,
        date: formatDate(booking?.createdAt),
        time: formatTime(booking?.createdAt),
      }));

      const statusOrder = (s) => {
        const order = {
          pending: 0,
          "pending-confirmation": 0,
          approved: 1,
          assigned: 2,
          "in-progress": 2,
          completed: 3,
          rejected: 4,
          cancelled: 5,
        };
        return order[s] ?? 99;
      };

      transformedBookings.sort((a, b) => {
        const d = statusOrder(a.status) - statusOrder(b.status);
        if (d !== 0) return d;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      setBookings(transformedBookings);
      setTotalPages(response?.pagination?.totalPages || 1);
      setTotalItems(response?.pagination?.total || 0);
      if (response?.stats) {
        setStats(response.stats);
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  }, [page, limit, sort, searchTerm, filterStatus, dateFrom, dateTo]);

  useEffect(() => {
    fetchBookings();
    clearBadge?.("bookings");
  }, [fetchBookings, clearBadge]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterStatus, dateFrom, dateTo]);

  useRefresh("bookings", fetchBookings);

  const handleStatusUpdate = async (id, status) => {
    if (!ADMIN_STATUSES.includes(status)) return;

    try {
      setProcessing(id);

      await apiRequest(`/admin/bookings/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === id
            ? {
                ...booking,
                status,
              }
            : booking,
        ),
      );

      setViewModal((prev) => {
        if (!prev.open || prev.booking?.id !== id) return prev;

        return {
          ...prev,
          booking: {
            ...prev.booking,
            status,
          },
        };
      });

      setError("");
    } catch (err) {
      if (err?.details?.refreshRecommended) {
        await fetchBookings();
      }
      setError(err?.message || "Failed to update booking status");
    } finally {
      setProcessing(null);
    }
  };

  const handleAutoAssign = async (booking) => {
    try {
      setProcessing(booking.id);
      await apiRequest(`/admin/bookings/${booking.id}/auto-assign`, {
        method: "PATCH",
      });
      await fetchBookings();
      setError("");
    } catch (err) {
      setError(err?.message || "Auto-assign failed");
    } finally {
      setProcessing(null);
    }
  };

  const handleAssignWorker = async (bookingId, workerId) => {
    try {
      setProcessing(bookingId);
      await apiRequest(`/admin/bookings/${bookingId}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ workerId }),
      });
      setRankingModal({ open: false, booking: null, workers: [] });
      await fetchBookings();
      setError("");
    } catch (err) {
      setError(err?.message || "Failed to assign worker");
    } finally {
      setProcessing(null);
    }
  };

  const handleShowRanking = async (booking) => {
    try {
      setProcessing(booking.id);

      const response = await apiRequest(`/ranking/booking/${booking.id}`);

      setRankingModal({
        open: true,
        booking: response?.data?.booking || booking,
        workers: response?.data?.workers || [],
      });

      setError("");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to fetch worker ranking");
    } finally {
      setProcessing(null);
    }
  };

  const handleSort = (field) => {
    const newSort = sort === field ? `-${field}` : field;
    setSort(newSort);
  };

  const handleRetry = () => {
    fetchBookings();
  };

  const BOOKING_STATUS_OPTIONS = [
    { value: "all", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "assigned", label: "Worker Assigned" },
    { value: "rejected", label: "Rejected" },
    { value: "completed", label: "Completed" },
  ];

  const getStatusConfig = (status) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  };

  const renderStatusBadge = (status) => {
    const cfg = getStatusConfig(status);
    const Icon = cfg.icon;

    return (
      <span
        className={`inline-flex items-center justify-center w-8 h-8 rounded-full border ${cfg.color}`}
      >
        <Icon
          size={16}
          className={status === "in-progress" ? "animate-spin" : ""}
        />
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1 px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg text-red-700 transition-colors"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={<Clock size={18} />}
          color="yellow"
          active={filterStatus === "pending"}
          onClick={() =>
            setFilterStatus(filterStatus === "pending" ? "all" : "pending")
          }
        />
        <StatCard
          title="Approved"
          value={stats.approved}
          icon={<CheckCircle size={18} />}
          color="green"
          active={filterStatus === "approved"}
          onClick={() =>
            setFilterStatus(filterStatus === "approved" ? "all" : "approved")
          }
        />
        <StatCard
          title="Worker Assigned"
          value={stats.assigned}
          icon={<UserCheck size={18} />}
          color="orange"
          active={filterStatus === "assigned"}
          onClick={() =>
            setFilterStatus(filterStatus === "assigned" ? "all" : "assigned")
          }
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircle size={18} />}
          color="purple"
          active={filterStatus === "completed"}
          onClick={() =>
            setFilterStatus(filterStatus === "completed" ? "all" : "completed")
          }
        />
        <StatCard
          title="Rejected"
          value={stats.rejected}
          icon={<XCircle size={18} />}
          color="red"
          active={filterStatus === "rejected"}
          onClick={() =>
            setFilterStatus(filterStatus === "rejected" ? "all" : "rejected")
          }
        />
      </div>

      <ListToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by customer, service, email or address..."
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        statusOptions={BOOKING_STATUS_OPTIONS}
        showDateFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onClearDates={() => {
          setDateFrom("");
          setDateTo("");
        }}
        onSort={() => handleSort("createdAt")}
        sortLabel={sort.startsWith("-") ? "Newest first" : "Oldest first"}
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: limit }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="animate-pulse space-y-4">
                <div className="h-6 w-2/3 rounded bg-slate-200" />
                <div className="h-4 rounded bg-slate-200" />
                <div className="h-4 w-1/2 rounded bg-slate-200" />
              </div>
            </div>
          ))
        ) : bookings.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
              <Calendar size={32} className="text-slate-400" />
            </div>

            <h3 className="text-lg font-semibold text-slate-900">
              No bookings found
            </h3>

            <p className="mt-2 text-slate-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          bookings.map((booking) => {
            const cfg = getStatusConfig(booking.status);
            const Icon = cfg.icon;

            return (
              <div
                key={booking.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg"
              >
                <div className="p-6">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {booking.customerProfilePicture ? (
                        <img
                          src={booking.customerProfilePicture}
                          alt={booking.customer}
                          referrerPolicy="no-referrer"
                          className="h-12 w-12 rounded-full border-2 border-orange-100 object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-lg font-bold text-white">
                          {booking.customer?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-900">
                          {booking.customer}
                        </h3>

                        <p className="truncate text-sm text-slate-500">
                          {booking.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {(booking.customerMarkedDone || booking.workerMarkedDone) && (
                        <CompletionTicks
                          customerMarkedDone={booking.customerMarkedDone}
                          workerMarkedDone={booking.workerMarkedDone}
                        />
                      )}
                      {renderStatusBadge(booking.status)}
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Wrench size={16} className="text-orange-500" />
                      <span className="truncate">{booking.service}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                      <MapPin size={16} className="text-orange-500" />
                      <span className="truncate">{booking.location}</span>
                    </div>

                    {booking.paymentDetails?.paymentMethod && (
                      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-700">
                        <Receipt
                          size={14}
                          className="shrink-0 text-orange-500"
                        />
                        <span className="font-medium text-slate-600">
                          Paid via
                        </span>
                        <span className="font-semibold text-slate-900">
                          {paymentMethodLabel(
                            booking.paymentDetails.paymentMethod,
                          )}
                        </span>
                      </div>
                    )}

                    {booking.paymentDetails?.paymentReceipt && (
                      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2 text-xs font-medium text-emerald-800">
                          <Receipt size={14} className="shrink-0" />
                          <span className="truncate">Payment receipt</span>
                        </div>
                        <ReceiptPreview
                          receiptPath={booking.paymentDetails.paymentReceipt}
                          thumbClassName="h-16 w-16"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <div>
                        <p className="text-xs uppercase text-slate-500">
                          Amount
                        </p>
                        <p className="text-lg font-bold text-slate-900">
                          ₨{booking.price.toLocaleString()}
                        </p>
                      </div>

                      <div className="text-right text-xs text-slate-500">
                        <p>{booking.date}</p>
                        <p>{booking.time}</p>
                      </div>
                    </div>

                    {booking.workerId && (
                      <div className="rounded-xl border border-purple-100 bg-purple-50 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-purple-700">
                            Worker Assigned
                          </span>
                          <button
                            onClick={() =>
                              setWorkerDetailsModal({
                                open: true,
                                worker: booking.worker,
                              })
                            }
                            className="text-xs text-purple-600 hover:text-purple-800 underline"
                          >
                            View Details
                          </button>
                        </div>
                        <div className="text-xs text-purple-600">
                          ID: #
                          {String(booking.workerId._id || booking.workerId)
                            .slice(-8)
                            .toUpperCase()}
                        </div>
                        {booking.worker?.fullName && (
                          <div className="text-xs text-purple-600 mt-1">
                            Name: {booking.worker.fullName}
                          </div>
                        )}
                        {booking.worker?.serviceCategory && (
                          <div className="text-xs text-purple-600">
                            Service: {booking.worker.serviceCategory}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    <button
                      onClick={() =>
                        setViewModal({
                          open: true,
                          booking,
                        })
                      }
                      className="flex flex-1 items-center justify-center rounded-xl bg-blue-100 px-4 py-3 text-blue-700 transition-colors hover:bg-blue-200"
                    >
                      <Eye size={20} />
                    </button>

                    {booking.status === "approved" && !booking.workerId && (
                      <>
                        <button
                          onClick={() => handleAutoAssign(booking)}
                          disabled={processing === booking.id}
                          title="Auto-assign best worker"
                          className="rounded-xl bg-emerald-500 px-3 py-3 text-white transition-colors hover:bg-emerald-600 disabled:opacity-60 text-xs font-semibold"
                        >
                          Auto
                        </button>
                        <button
                          onClick={() => handleShowRanking(booking)}
                          disabled={processing === booking.id}
                          className="rounded-xl bg-purple-500 px-4 py-3 text-white transition-colors hover:bg-purple-600 disabled:opacity-60"
                          title="View ranking"
                        >
                          <Trophy size={20} />
                        </button>
                      </>
                    )}

                    {isAdminControlled(booking.status) && (
                      <>
                        <button
                          onClick={() =>
                            handleStatusUpdate(booking.id, "approved")
                          }
                          disabled={processing === booking.id}
                          className="rounded-xl bg-emerald-500 px-4 py-3 text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
                        >
                          <CheckCircle size={20} />
                        </button>

                        <button
                          onClick={() =>
                            handleStatusUpdate(booking.id, "rejected")
                          }
                          disabled={processing === booking.id}
                          className="rounded-xl bg-red-500 px-4 py-3 text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                        >
                          <XCircle size={20} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          limit={limit}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          totalItems={totalItems}
        />
      )}

      {viewModal.open && viewModal.booking && (
        <BookingModal
          booking={viewModal.booking}
          processing={processing}
          onClose={() =>
            setViewModal({
              open: false,
              booking: null,
            })
          }
          onApprove={() => handleStatusUpdate(viewModal.booking.id, "approved")}
          onReject={() => handleStatusUpdate(viewModal.booking.id, "rejected")}
        />
      )}

      {rankingModal.open && (
        <RankingModal
          rankingModal={rankingModal}
          onClose={() =>
            setRankingModal({
              open: false,
              booking: null,
              workers: [],
            })
          }
          onAssign={handleAssignWorker}
          assigning={processing === rankingModal.booking?.id}
        />
      )}

      {workerDetailsModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Worker Details
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Complete worker information and profile
                </p>
              </div>
              <button
                onClick={() =>
                  setWorkerDetailsModal({
                    open: false,
                    worker: null,
                  })
                }
                className="h-10 w-10 rounded-full border border-slate-200 p-2 hover:bg-slate-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {workerDetailsModal.worker ? (
                <div className="space-y-6">
                  {/* Worker Profile Section */}
                  <div className="flex items-start gap-4">
                    {resolveMediaUrl(workerDetailsModal.worker.profilePicture) ? (
                      <img
                        src={resolveMediaUrl(workerDetailsModal.worker.profilePicture)}
                        alt={workerDetailsModal.worker.fullName}
                        referrerPolicy="no-referrer"
                        className="h-16 w-16 rounded-full border-2 border-purple-100 object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-purple-600 text-2xl font-bold text-white">
                        {workerDetailsModal.worker.fullName
                          ?.charAt(0)
                          ?.toUpperCase() || "?"}
                      </div>
                    )}

                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-slate-900">
                        {workerDetailsModal.worker.fullName || "Unknown Worker"}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Phone size={14} />
                          {workerDetailsModal.worker.phoneNumber || "N/A"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail size={14} />
                          {workerDetailsModal.worker.emailAddress || "N/A"}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          {workerDetailsModal.worker.primaryServiceCategory ||
                            workerDetailsModal.worker.serviceCategory ||
                            "No Service"}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            workerDetailsModal.worker.status === "approved"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {workerDetailsModal.worker.status || "Unknown Status"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Worker Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 p-4">
                      <h4 className="font-semibold text-slate-900 mb-3">
                        Service Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">
                            Service Category:
                          </span>
                          <span className="font-medium">
                            {workerDetailsModal.worker.primaryServiceCategory ||
                              workerDetailsModal.worker.serviceCategory ||
                              "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Service Area:</span>
                          <span className="font-medium">
                            {workerDetailsModal.worker.serviceArea || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Availability:</span>
                          <span
                            className={`font-medium ${
                              workerDetailsModal.worker.availability
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {workerDetailsModal.worker.availability
                              ? "Available"
                              : "Unavailable"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4">
                      <h4 className="font-semibold text-slate-900 mb-3">
                        Performance
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total Jobs:</span>
                          <span className="font-medium">
                            {workerDetailsModal.worker.totalJobs || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">
                            Completed Jobs:
                          </span>
                          <span className="font-medium">
                            {workerDetailsModal.worker.completedJobs || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">
                            Total Earnings:
                          </span>
                          <span className="font-medium">
                            Rs
                            {workerDetailsModal.worker.totalEarnings?.toLocaleString() ||
                              0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location Information */}
                  {(workerDetailsModal.worker.location ||
                    workerDetailsModal.worker.address ||
                    workerDetailsModal.worker.serviceArea) && (
                    <div className="rounded-xl border border-slate-200 p-4">
                      <h4 className="font-semibold text-slate-900 mb-3">
                        Location
                      </h4>
                      <p className="text-sm text-slate-600">
                        {workerDetailsModal.worker.location ||
                          workerDetailsModal.worker.address ||
                          workerDetailsModal.worker.serviceArea}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500">
                    Worker information not available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingModal({ booking, processing, onClose, onApprove, onReject }) {
  const receiptUrl = getReceiptImageUrl(booking.paymentDetails?.paymentReceipt);
  const hasReceipt = Boolean(receiptUrl);
  const isCompleted = booking.status === "completed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Booking Details
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              #{booking.id.slice(-8).toUpperCase()}
            </p>
            {(booking.customerMarkedDone || booking.workerMarkedDone) && (
              <div className="mt-3 flex items-center gap-3 text-sm">
                <CompletionTicks
                  customerMarkedDone={booking.customerMarkedDone}
                  workerMarkedDone={booking.workerMarkedDone}
                  size={20}
                />
                <span className="text-slate-600">
                  <span className="text-orange-600 font-medium">Orange</span> = customer
                  {" · "}
                  <span className="text-blue-600 font-medium">Blue</span> = worker
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
          <div>
            <h3 className="mb-3 font-semibold text-slate-900">
              Customer Information
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard
                icon={<User size={16} />}
                label="Name"
                value={booking.customer}
              />
              <InfoCard
                icon={<Mail size={16} />}
                label="Email"
                value={booking.email}
              />
              <InfoCard
                icon={<Phone size={16} />}
                label="Phone"
                value={booking.phone}
              />
              <InfoCard
                icon={<MapPin size={16} />}
                label="Location"
                value={booking.location}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-semibold text-slate-900">
              Service Details
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard
                icon={<Wrench size={16} />}
                label="Service"
                value={booking.service}
              />
              <InfoCard
                icon={<FileText size={16} />}
                label="Category"
                value={booking.category}
              />
              <InfoCard
                icon={<DollarSign size={16} />}
                label="Price"
                value={`₨${booking.price.toLocaleString()}`}
              />
              <InfoCard
                icon={<Calendar size={16} />}
                label="Booked On"
                value={`${booking.date} at ${booking.time}`}
              />
              {booking.paymentDetails?.paymentMethod && (
                <InfoCard
                  icon={<Receipt size={16} />}
                  label="Payment method"
                  value={paymentMethodLabel(
                    booking.paymentDetails.paymentMethod,
                  )}
                />
              )}
            </div>
          </div>

          {booking.notes && (
            <div>
              <h3 className="mb-3 font-semibold text-slate-900">
                Customer Notes
              </h3>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-slate-700">
                {booking.notes}
              </div>
            </div>
          )}

          {booking.worker && (
            <div>
              <h3 className="mb-3 font-semibold text-slate-900">
                Assigned Worker
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard
                  icon={<UserCheck size={16} />}
                  label="Worker Name"
                  value={booking.worker.fullName || "N/A"}
                />
                <InfoCard
                  icon={<Phone size={16} />}
                  label="Worker Phone"
                  value={booking.worker.phoneNumber || "N/A"}
                />
                <InfoCard
                  icon={<Mail size={16} />}
                  label="Worker Email"
                  value={booking.worker.emailAddress || "N/A"}
                />
                <InfoCard
                  icon={<Wrench size={16} />}
                  label="Service Category"
                  value={
                    booking.worker.primaryServiceCategory ||
                    booking.worker.serviceCategory ||
                    "N/A"
                  }
                />
                <InfoCard
                  icon={<Star size={16} />}
                  label="Rating"
                  value={
                    booking.worker.rating ? (
                      <div className="flex items-center gap-1">
                        <Star
                          size={14}
                          className="fill-amber-400 text-amber-400"
                        />
                        <span>
                          {booking.worker.rating.toFixed(1)} (
                          {booking.worker.totalReviews || 0} reviews)
                        </span>
                      </div>
                    ) : (
                      "No rating yet"
                    )
                  }
                />
              </div>
            </div>
          )}

          {hasReceipt && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Receipt size={18} className="text-emerald-600" />
                <h3 className="font-semibold text-slate-900">
                  Payment Receipt
                </h3>
                {!isCompleted && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    Submitted with booking
                  </span>
                )}
              </div>
              {booking.paymentDetails?.payToSummary ? (
                <p className="mb-3 text-xs text-slate-600">
                  <span className="font-medium text-slate-700">
                    Pay-to note:{" "}
                  </span>
                  {booking.paymentDetails.payToSummary}
                </p>
              ) : null}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <ReceiptPreview
                  receiptPath={booking.paymentDetails?.paymentReceipt}
                  thumbClassName="block h-40 w-full sm:w-44 min-h-[160px]"
                  imgClassName="h-40 w-full object-contain bg-white p-1"
                />
                <div className="min-w-0 flex-1">
                  <InfoCard
                    icon={<DollarSign size={16} />}
                    label="Quoted Price"
                    value={`₨${(booking.paymentDetails?.totalAmount || booking.price || 0).toLocaleString()}`}
                  />
                </div>
              </div>
            </div>
          )}

          {isCompleted && booking.paymentDetails && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 font-semibold text-slate-900">
                Payment Breakdown
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <InfoCard
                  icon={<DollarSign size={16} />}
                  label="Total Amount"
                  value={`Rs${booking.paymentDetails.totalAmount?.toLocaleString()}`}
                />
                <InfoCard
                  icon={<DollarSign size={16} />}
                  label="Service Fee (15%)"
                  value={`Rs${booking.paymentDetails.serviceFee?.toLocaleString()}`}
                />
                <InfoCard
                  icon={<DollarSign size={16} />}
                  label="Worker Earnings"
                  value={`Rs${booking.paymentDetails.workerEarnings?.toLocaleString()}`}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 p-6">
          {isAdminControlled(booking.status) && (
            <>
              <button
                onClick={onApprove}
                disabled={processing === booking.id}
                className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
              >
                Approve
              </button>

              <button
                onClick={onReject}
                disabled={processing === booking.id}
                className="rounded-xl bg-red-500 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-60"
              >
                Reject
              </button>
            </>
          )}

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function RankingModal({ rankingModal, onClose, onAssign, assigning }) {
  const bookingId = rankingModal.booking?.id || rankingModal.booking?._id;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Worker Ranking
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {rankingModal.booking?.serviceTitle || "Service"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          {rankingModal.workers.length === 0 ? (
            <div className="py-12 text-center">
              <User className="mx-auto mb-4 text-slate-300" size={48} />
              <p className="text-lg font-semibold text-slate-600">
                No workers available
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {rankingModal.workers.map((worker, index) => (
                <div
                  key={worker?._id || index}
                  className="rounded-2xl border border-slate-200 p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 font-bold text-white">
                        {index + 1}
                      </div>

                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {worker?.fullName || "Unknown Worker"}
                        </h3>

                        <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
                          <span>📞 {worker?.phoneNumber || "N/A"}</span>
                          <span>✉️ {worker?.emailAddress || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                        <Metric label="Score" value={worker?.rankingScore || 0} />
                        <Metric label="Rating" value={worker?.rating || "0.0"} />
                        <Metric
                          label="Completion"
                          value={`${worker?.completionRate || 0}%`}
                        />
                        <Metric
                          label="Experience"
                          value={`${worker?.yearsOfExperience || 0} yrs`}
                        />
                      </div>
                      {index === 0 && (
                        <span className="text-xs font-semibold text-emerald-600">
                          Recommended
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={assigning}
                        onClick={() =>
                          onAssign?.(bookingId, worker._id || worker.id)
                        }
                        className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
                      >
                        {assigning ? "Assigning..." : "Assign this worker"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
      <div className="mt-0.5 text-slate-400">{icon}</div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase text-slate-500">{label}</p>

        <p className="break-words font-medium text-slate-900">
          {value || "N/A"}
        </p>
      </div>
    </div>
  );
}
