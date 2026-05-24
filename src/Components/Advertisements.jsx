import { useState, useEffect } from "react";
import {
  Megaphone,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  Loader2,
  AlertTriangle,
  Image as ImageIcon,
  Video,
  User,
  Mail,
  Phone,
  FileText,
  Clock,
  Filter,
  Search,
  X,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import { useRefresh } from "../context/SocketContext";
import { resolveUploadMediaUrl } from "../utils/mediaUrl.js";

const getImageUrl = (url) => resolveUploadMediaUrl(url);

export default function Advertisements() {
  const [ads, setAds] = useState([]);
  const [brokenAvatars, setBrokenAvatars] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAd, setSelectedAd] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewingId, setReviewingId] = useState(null);
  const [previewModal, setPreviewModal] = useState(null);

  const fetchAds = async () => {
    setLoading(true);
    setError("");
    try {
      const [adsRes, statsRes] = await Promise.all([
        apiRequest("/advertisements"),
        apiRequest("/advertisements/stats"),
      ]);
      setAds(adsRes.data || []);
      setStats(
        statsRes.data || { total: 0, pending: 0, approved: 0, rejected: 0 },
      );
    } catch (err) {
      setError(err.message || "Failed to load advertisements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  useRefresh("advertisements", fetchAds);

  const handleStatusUpdate = async (id, status) => {
    setReviewingId(id);
    try {
      await apiRequest(`/advertisements/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, adminNote: reviewNote.trim() }),
      });
      setReviewNote("");
      setSelectedAd(null);
      await fetchAds();
    } catch (err) {
      setError(err.message || "Failed to update status.");
    } finally {
      setReviewingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this advertisement?"))
      return;
    try {
      await apiRequest(`/advertisements/${id}`, { method: "DELETE" });
      await fetchAds();
    } catch (err) {
      setError(err.message || "Failed to delete advertisement.");
    }
  };

  const filteredAds = ads.filter((ad) => {
    const matchesFilter = filter === "all" || ad.status === filter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      ad.name?.toLowerCase().includes(searchLower) ||
      ad.email?.toLowerCase().includes(searchLower) ||
      ad.phone?.toLowerCase().includes(searchLower) ||
      ad.purpose?.toLowerCase().includes(searchLower) ||
      ad.duration?.toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  const statusConfig = {
    pending: {
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      label: "Pending",
      icon: Clock,
    },
    approved: {
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
      label: "Approved",
      icon: CheckCircle,
    },
    rejected: {
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
      label: "Rejected",
      icon: XCircle,
    },
  };

  const renderStatusBadge = (status) => {
    const raw = status && statusConfig[status] ? status : "pending";
    const config = statusConfig[raw] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${config.bg} ${config.color} ${config.border} border`}
      >
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6 rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50/40 via-white to-slate-50/80 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Megaphone size={28} className="text-orange-500" />
            Advertisements
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Review and manage advertisement submissions
          </p>
        </div>
        <button
          onClick={fetchAds}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Clock size={16} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            key: "total",
            label: "Total",
            value: stats.total,
            color: "text-slate-700",
            bg: "bg-white",
            border: "border-slate-200",
          },
          {
            key: "pending",
            label: "Pending",
            value: stats.pending,
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-amber-200",
          },
          {
            key: "approved",
            label: "Approved",
            value: stats.approved,
            color: "text-green-600",
            bg: "bg-green-50",
            border: "border-green-200",
          },
          {
            key: "rejected",
            label: "Rejected",
            value: stats.rejected,
            color: "text-red-600",
            bg: "bg-red-50",
            border: "border-red-200",
          },
        ].map((stat) => (
          <div
            key={stat.key}
            className={`rounded-xl border ${stat.border} ${stat.bg} p-4`}
          >
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {stat.label}
            </p>
            <p className={`text-2xl font-bold ${stat.color} mt-1`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <Filter size={16} className="text-slate-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-transparent text-sm text-slate-700 outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, phone, or purpose..."
            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 size={40} className="animate-spin text-orange-500 mb-3" />
          <p className="text-slate-500">Loading advertisements...</p>
        </div>
      ) : filteredAds.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
          <Megaphone size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No advertisements found</p>
          <p className="text-sm text-slate-400 mt-1">
            {filter !== "all"
              ? "Try changing the filter"
              : "New submissions will appear here"}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredAds.map((ad) => {
            const aid = String(ad.id || ad._id);
            const effectiveStatus =
              ad.status === "approved" ||
              ad.status === "rejected" ||
              ad.status === "pending"
                ? ad.status
                : "pending";
            const picUrl = ad.submitterProfilePicture
              ? getImageUrl(ad.submitterProfilePicture)
              : "";
            const showPic = picUrl && !brokenAvatars[aid];

            return (
              <div
                key={aid}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg"
              >
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {showPic ? (
                        <img
                          src={picUrl}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-full border-2 border-orange-100 object-cover"
                          onError={() =>
                            setBrokenAvatars((prev) => ({
                              ...prev,
                              [aid]: true,
                            }))
                          }
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-lg font-bold text-white">
                          {ad.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-900">
                          {ad.name}
                        </h3>
                        <p className="truncate text-sm text-slate-500">
                          {ad.email}
                        </p>
                      </div>
                    </div>

                    {renderStatusBadge(effectiveStatus)}
                  </div>

                  <div className="flex flex-1 flex-col space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-700">
                      <FileText size={16} className="text-orange-500" />
                      <span className="truncate">{ad.purpose}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone size={16} className="text-orange-500" />
                      <span>{ad.phone}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                      <Clock size={16} className="text-orange-500" />
                      <span>{ad.duration || "1 week"}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                      {ad.adType === "image" ? (
                        <ImageIcon size={16} className="text-orange-500" />
                      ) : (
                        <Video size={16} className="text-orange-500" />
                      )}
                      <span>{ad.adType === "image" ? "Image" : "Video"}</span>
                    </div>

                    {/* Media Preview Thumbnail */}
                    <div className="mt-3">
                      {ad.adFileUrls && ad.adFileUrls.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {ad.adFileUrls.slice(0, 3).map((url, idx) => (
                            <div key={idx} className="relative">
                              {ad.adType === "image" ? (
                                <img
                                  src={getImageUrl(url)}
                                  alt={`Advertisement ${idx + 1}`}
                                  className="w-full h-20 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() =>
                                    setPreviewModal({
                                      ...ad,
                                      previewIndex: idx,
                                    })
                                  }
                                />
                              ) : (
                                <div
                                  className="w-full h-20 rounded-lg bg-slate-900 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity border border-slate-200"
                                  onClick={() =>
                                    setPreviewModal({
                                      ...ad,
                                      previewIndex: idx,
                                    })
                                  }
                                >
                                  <Video size={16} className="text-white" />
                                </div>
                              )}
                              {ad.adFileUrls.length > 1 && (
                                <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                                  {idx + 1}/{ad.adFileUrls.length}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="w-full h-20 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                          <span className="text-sm text-slate-400">
                            No media
                          </span>
                        </div>
                      )}
                    </div>

                    {ad.adminNote && (
                      <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
                        <span className="font-semibold text-slate-700">
                          Admin Note:
                        </span>{" "}
                        {ad.adminNote}
                      </div>
                    )}

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <div>
                        <p className="text-xs uppercase text-slate-500">
                          Submitted
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {new Date(ad.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>

                      <div className="text-right text-xs text-slate-500">
                        <p>
                          {new Date(ad.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="capitalize">{ad.submitterType}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => setPreviewModal(ad)}
                      className="flex flex-1 items-center justify-center rounded-xl bg-blue-100 px-4 py-3 text-blue-700 transition-colors hover:bg-blue-200"
                    >
                      <Eye size={20} />
                    </button>

                    {effectiveStatus === "pending" && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(aid, "approved")}
                          disabled={reviewingId === aid}
                          className="rounded-xl bg-emerald-500 px-4 py-3 text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
                        >
                          {reviewingId === aid ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            <CheckCircle size={20} />
                          )}
                        </button>
                        <button
                          onClick={() => setSelectedAd(ad)}
                          className="rounded-xl bg-red-500 px-4 py-3 text-white transition-colors hover:bg-red-600"
                        >
                          <ThumbsDown size={20} />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleDelete(aid)}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {selectedAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Reject Advertisement
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                From: {selectedAd.name} — {selectedAd.email}
              </p>
            </div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Rejection Reason (optional)
            </label>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Enter a reason for rejection..."
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedAd(null)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusUpdate(selectedAd.id, "rejected")}
                disabled={reviewingId === selectedAd.id}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {reviewingId === selectedAd.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ThumbsDown size={16} />
                )}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewModal(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div className="flex items-center gap-2">
                {previewModal.adType === "image" ? (
                  <ImageIcon size={18} className="text-orange-500" />
                ) : (
                  <Video size={18} className="text-orange-500" />
                )}
                <span className="text-sm font-semibold text-slate-900">
                  {previewModal.name}'s Advertisement
                </span>
                {previewModal.adFileUrls &&
                  previewModal.adFileUrls.length > 1 && (
                    <span className="text-xs text-slate-500">
                      ({(previewModal.previewIndex || 0) + 1}/
                      {previewModal.adFileUrls.length})
                    </span>
                  )}
              </div>
              <button
                onClick={() => setPreviewModal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              {previewModal.adFileUrls && previewModal.adFileUrls.length > 0 ? (
                <div className="space-y-4">
                  {previewModal.adType === "image" ? (
                    <img
                      src={getImageUrl(
                        previewModal.adFileUrls[previewModal.previewIndex || 0],
                      )}
                      alt="Advertisement"
                      className="w-full max-h-[60vh] object-contain rounded-lg bg-slate-100"
                    />
                  ) : (
                    <video
                      src={getImageUrl(
                        previewModal.adFileUrls[previewModal.previewIndex || 0],
                      )}
                      controls
                      className="w-full max-h-[60vh] rounded-lg bg-slate-900"
                    />
                  )}
                  {previewModal.adFileUrls.length > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      {previewModal.adFileUrls.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() =>
                            setPreviewModal({
                              ...previewModal,
                              previewIndex: idx,
                            })
                          }
                          className={`w-2 h-2 rounded-full transition-all ${
                            (previewModal.previewIndex || 0) === idx
                              ? "bg-orange-500 w-6"
                              : "bg-orange-200 hover:bg-orange-300"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-64 rounded-lg bg-slate-100 flex items-center justify-center">
                  <span className="text-slate-400">No media available</span>
                </div>
              )}
              <div className="mt-4 rounded-lg bg-slate-50 p-3 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Purpose
                </p>
                <p className="text-sm text-slate-700">{previewModal.purpose}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
