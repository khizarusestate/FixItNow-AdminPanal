import {
  Search,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Calendar,
  Clock,
  X,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  User,
  Package,
  Save,
  Loader2,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { apiRequest, paginatedRequest } from "../lib/api";
import { resolveMediaUrl } from "../lib/media";
import { useRefresh, useSocket } from "../context/SocketContext";
import Pagination from "./Pagination";
import { RefreshCw } from "lucide-react";
import ListToolbar, { StatCard } from "./shared/ListToolbar";
import LocationPicker from "./LocationPicker.jsx";
import { geoFromUser } from "../utils/location.js";

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState("-createdAt");
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stats, setStats] = useState({ active: 0, inactive: 0, pending: 0 });

  const CUSTOMER_STATUS_OPTIONS = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "pending", label: "Pending" },
  ];

  // Modal states
  const [viewModal, setViewModal] = useState({ open: false, customer: null });
  const [editModal, setEditModal] = useState({ open: false, customer: null });
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    customer: null,
  });
  const [saving, setSaving] = useState(false);
  const [successBanner, setSuccessBanner] = useState("");
  const [customerGeo, setCustomerGeo] = useState(() => geoFromUser(null));

  const { clearBadge } = useSocket();

  // ✅ Fetch users (customers only)
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit,
        sort,
        ...(searchTerm && { search: searchTerm }),
        ...(filterStatus !== "all" && { status: filterStatus }),
      };

      const res = await paginatedRequest("/admin/customers", {
        ...params,
        ...(dateFrom && { startDate: dateFrom }),
        ...(dateTo && { endDate: dateTo }),
      });
      setCustomers(
        (res?.data?.customers || res?.data || []).map((c) => ({
          id: c._id,
          fullName: c.fullName,
          email: c.email,
          phone: c.phone,
          location:
            c.location ||
            c.address ||
            (c.city && c.area
              ? `${c.city}, ${c.area}`
              : c.city || c.area || ""),
          latitude: c.latitude ?? null,
          longitude: c.longitude ?? null,
          placeId: c.placeId || "",
          profilePicture: c.profilePicture,
          status: c.status || "approved",
          isActive: c.isActive ?? true,
          isVerified: c.isVerified ?? false,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          totalBookings: c.totalBookings || 0,
          pendingBookings: c.pendingBookings || 0,
          completedBookings: c.completedBookings || 0,
          lastBooking: c.lastBooking,
        })),
      );
      setTotalPages(res?.pagination?.totalPages || 1);
      setTotalItems(res?.pagination?.total || 0);
      if (res?.stats) setStats(res.stats);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [page, limit, sort, searchTerm, filterStatus, dateFrom, dateTo]);

  useEffect(() => {
    fetchCustomers();
    clearBadge("customers");
  }, [fetchCustomers, clearBadge]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterStatus, dateFrom, dateTo]);

  // Real-time updates via Socket.IO
  useRefresh("customers", fetchCustomers);

  const handleSort = (field) => {
    const newSort = sort === field ? `-${field}` : field;
    setSort(newSort);
  };

  const handleRetry = () => {
    fetchCustomers();
  };

  // ✅ Date format
  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // ✅ View Customer
  const handleView = async (customer) => {
    try {
      setLoading(true);
      const res = await apiRequest(`/admin/customers/${customer.id}`);
      setViewModal({ open: true, customer: res.data });
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to fetch customer details",
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ Edit Customer
  const handleEdit = (customer) => {
    setCustomerGeo(geoFromUser(customer));
    setEditModal({
      open: true,
      customer: { ...customer },
    });
  };

  // ✅ Approve Customer
  const handleApprove = async (customerId) => {
    try {
      await apiRequest(`/admin/customers/${customerId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "approved" }),
      });
      fetchCustomers();
      setError("");
      setSuccessBanner("Customer approved successfully.");
      setTimeout(() => setSuccessBanner(""), 4000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve customer");
    }
  };

  // ✅ Save Edit
  const handleSaveEdit = async () => {
    if (!editModal.customer) return;

    setSaving(true);
    try {
      await apiRequest(`/admin/customers/${editModal.customer.id}`, {
        method: "PUT",
        body: JSON.stringify({
          fullName: editModal.customer.fullName,
          email: editModal.customer.email,
          phone: editModal.customer.phone,
          location: customerGeo.location?.trim() || "",
          latitude: customerGeo.latitude,
          longitude: customerGeo.longitude,
          placeId: customerGeo.placeId,
          status: editModal.customer.status,
          isActive: editModal.customer.isActive,
        }),
      });

      setEditModal({ open: false, customer: null });
      fetchCustomers();
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update customer");
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async (customerId) => {
    try {
      await apiRequest(`/admin/users/${customerId}?role=customer`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      });
      fetchCustomers();
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to disable customer");
    }
  };

  const handleEnable = async (customerId) => {
    try {
      await apiRequest(`/admin/users/${customerId}?role=customer`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: true }),
      });
      fetchCustomers();
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to enable customer");
    }
  };

  // ✅ Delete
  const handleDelete = async () => {
    if (!deleteConfirm.customer) return;

    try {
      await apiRequest(`/admin/users/${deleteConfirm.customer.id}`, {
        method: "DELETE",
      });
      setCustomers((prev) =>
        prev.filter((c) => c.id !== deleteConfirm.customer.id),
      );
      setDeleteConfirm({ open: false, customer: null });
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  // Status badge
  const getStatusBadge = (status, isActive) => {
    if (!isActive) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 flex items-center gap-1">
          <XCircle size={12} /> Disabled
        </span>
      );
    }
    if (status === "active") {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle size={12} /> Active
        </span>
      );
    }
    if (status === "inactive") {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
          <Clock size={12} /> Inactive
        </span>
      );
    }
    if (status === "pending" || status === "pending-verification") {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-1">
          <Clock size={12} /> Pending
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
        <User size={12} /> {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {successBanner && (
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-4 py-2 rounded-lg text-sm border border-emerald-200">
          <CheckCircle size={16} className="shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
          <span>{error}</span>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1 px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg text-red-700 transition-colors"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard
          title="Active"
          value={stats.active}
          icon={<CheckCircle size={18} />}
          color="green"
          active={filterStatus === "active"}
          onClick={() =>
            setFilterStatus(filterStatus === "active" ? "all" : "active")
          }
        />
        <StatCard
          title="Inactive"
          value={stats.inactive}
          icon={<XCircle size={18} />}
          color="slate"
          active={filterStatus === "inactive"}
          onClick={() =>
            setFilterStatus(filterStatus === "inactive" ? "all" : "inactive")
          }
        />
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
      </div>

      <ListToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by name, email or phone..."
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        statusOptions={CUSTOMER_STATUS_OPTIONS}
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

      {/* Customer Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: limit }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 animate-pulse"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 bg-slate-200 rounded w-24"></div>
                <div className="h-6 bg-slate-200 rounded w-20"></div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                <div className="h-10 bg-slate-200 rounded w-full mt-4"></div>
              </div>
            </div>
          ))
        ) : customers.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No customers found
            </h3>
            <p className="text-slate-500">
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : (
          customers.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all duration-300 overflow-hidden group"
            >
              {/* Customer Header */}
              <div className="relative p-6 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
                <div className="flex items-start gap-4">
                  {resolveMediaUrl(c.profilePicture) ? (
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-orange-100 shadow-sm flex-shrink-0">
                      <img
                        src={resolveMediaUrl(c.profilePicture)}
                        alt={c.fullName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-bold shadow-sm border-2 border-orange-100 flex-shrink-0">
                      {c.fullName?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-slate-900 truncate group-hover:text-orange-600 transition-colors">
                      {c.fullName}
                    </h3>
                    <p className="text-sm text-slate-500 truncate">{c.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(c.status, c.isActive)}
                      <span className="text-xs text-slate-500">
                        Member since {formatDate(c.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Details */}
              <div className="p-6 space-y-4">
                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400" />
                    <span className="text-slate-600 truncate">
                      {c.phone || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400" />
                    <span className="text-slate-600 truncate">
                      {c.location || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Booking Stats */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium">
                      Total Bookings
                    </p>
                    <p className="text-lg font-bold text-blue-700">
                      {c.totalBookings || 0}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600 font-medium">
                      Completed
                    </p>
                    <p className="text-lg font-bold text-green-700">
                      {c.completedBookings || 0}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <p className="text-xs text-amber-600 font-medium">
                      Pending
                    </p>
                    <p className="text-lg font-bold text-amber-700">
                      {c.pendingBookings || 0}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleView(c)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => handleEdit(c)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium"
                  >
                    <Edit size={16} />
                  </button>
                  {c.status === "pending" && (
                    <button
                      onClick={() => handleApprove(c.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                  {!c.isActive ? (
                    <button
                      onClick={() => handleEnable(c.id)}
                      className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      title="Enable account"
                    >
                      <CheckCircle size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDisable(c.id)}
                      className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                      title="Disable account (blocks login)"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                  {c.status === "inactive" && c.isActive && (
                    <button
                      onClick={() =>
                        setDeleteConfirm({ open: true, customer: c })
                      }
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      title="Delete (logged out)"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
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

      {/* View Modal */}
      {viewModal.open && viewModal.customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-slate-900">
                Customer Details
              </h2>
              <button
                onClick={() => setViewModal({ open: false, customer: null })}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="flex items-center gap-4 mb-6">
                {resolveMediaUrl(viewModal.customer.profilePicture) ? (
                  <img
                    src={resolveMediaUrl(viewModal.customer.profilePicture)}
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    alt={viewModal.customer.fullName}
                    className="h-20 w-20 rounded-full object-cover border-2 border-orange-200"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-3xl font-bold">
                    {viewModal.customer.fullName?.charAt(0)?.toUpperCase() ||
                      "?"}
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {viewModal.customer.fullName}
                  </h3>
                  <p className="text-slate-500">
                    Customer since {formatDate(viewModal.customer.createdAt)}
                  </p>
                  {getStatusBadge(
                    viewModal.customer.status,
                    viewModal.customer.isActive,
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <InfoCard
                  icon={<Mail size={18} />}
                  label="Email"
                  value={viewModal.customer.email}
                />
                <InfoCard
                  icon={<Phone size={18} />}
                  label="Phone"
                  value={viewModal.customer.phone || "N/A"}
                />
                <InfoCard
                  icon={<MapPin size={18} />}
                  label="Location"
                  value={
                    viewModal.customer.location ||
                    viewModal.customer.address ||
                    "N/A"
                  }
                />
                <InfoCard
                  icon={<Calendar size={18} />}
                  label="Member Since"
                  value={formatDate(viewModal.customer.createdAt)}
                />
              </div>

              <h4 className="font-semibold text-slate-900 mb-3">
                Booking History ({viewModal.customer.bookings?.length || 0})
              </h4>
              {viewModal.customer.bookings?.length > 0 ? (
                <div className="space-y-2">
                  {viewModal.customer.bookings
                    .slice(0, 5)
                    .map((booking, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {booking.serviceTitle}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(booking.createdAt)}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            booking.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : booking.status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">
                  No bookings yet
                </p>
              )}
            </div>

            <div className="p-6 border-t bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewModal({ open: false, customer: null })}
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal.open && editModal.customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-slate-900">
                Edit Customer
              </h2>
              <button
                onClick={() => setEditModal({ open: false, customer: null })}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editModal.customer.fullName}
                  onChange={(e) =>
                    setEditModal((prev) => ({
                      ...prev,
                      customer: { ...prev.customer, fullName: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editModal.customer.email}
                  onChange={(e) =>
                    setEditModal((prev) => ({
                      ...prev,
                      customer: { ...prev.customer, email: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editModal.customer.phone || ""}
                  onChange={(e) =>
                    setEditModal((prev) => ({
                      ...prev,
                      customer: { ...prev.customer, phone: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                />
              </div>

              <div>
                <LocationPicker
                  label="Location"
                  required
                  value={customerGeo}
                  onChange={setCustomerGeo}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editModal.customer.status}
                    onChange={(e) =>
                      setEditModal((prev) => ({
                        ...prev,
                        customer: { ...prev.customer, status: e.target.value },
                      }))
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Active
                  </label>
                  <select
                    value={editModal.customer.isActive}
                    onChange={(e) =>
                      setEditModal((prev) => ({
                        ...prev,
                        customer: {
                          ...prev.customer,
                          isActive: e.target.value === "true",
                        },
                      }))
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                  >
                    <option value={true}>Yes</option>
                    <option value={false}>No</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setEditModal({ open: false, customer: null })}
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.open && deleteConfirm.customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Delete Customer?
            </h2>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete{" "}
              <strong>{deleteConfirm.customer.fullName}</strong>? This action
              cannot be undone and all their data will be permanently removed.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() =>
                  setDeleteConfirm({ open: false, customer: null })
                }
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
      <div className="text-slate-400 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-slate-500 uppercase font-medium">{label}</p>
        <p className="text-slate-900 font-medium">{value}</p>
      </div>
    </div>
  );
}
