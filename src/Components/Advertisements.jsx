import { useState, useEffect, useCallback } from "react";
import {
  Megaphone,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  MoreVertical,
  Loader2,
  AlertTriangle,
  Image as ImageIcon,
  Video,
  FileText,
  Phone,
  Clock,
  Filter,
  Search,
  X,
  ThumbsDown,
  CreditCard,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import { useRefresh } from "../context/SocketContext";
import { resolveUploadMediaUrl } from "../utils/mediaUrl.js";
import ConfirmDialog from "./ConfirmDialog";
import Pagination from "./Pagination";

const getMediaUrl = (url) => resolveUploadMediaUrl(url);

const getFiles = (ad) => (ad?.adFileUrls?.length ? ad.adFileUrls : ad?.images || []);
const getPurpose = (ad) => ad?.purpose || ad?.description || ad?.title || "Advertisement";
const getName = (ad) => ad?.name || ad?.workerId?.fullName || ad?.customerId?.fullName || "Advertiser";
const getEmail = (ad) => ad?.email || ad?.workerId?.email || ad?.customerId?.email || "";
const getPhone = (ad) => ad?.phone || ad?.phoneNumber || ad?.workerId?.phoneNumber || ad?.customerId?.phone || "";

export default function Advertisements() {
  const [ads, setAds] = useState([]);
  const [brokenAvatars, setBrokenAvatars] = useState({});
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAd, setSelectedAd] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewingId, setReviewingId] = useState(null);
  const [previewModal, setPreviewModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [deleting, setDeleting] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const fetchAds = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [adsRes, statsRes] = await Promise.all([
        apiRequest("/advertisements?limit=100"),
        apiRequest("/advertisements/stats"),
      ]);
      setAds(adsRes.data || []);
      setStats(statsRes.data || { total: 0, pending: 0, approved: 0, rejected: 0 });
    } catch (err) {
      setError(err.message || "Failed to load advertisements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAds(); }, [fetchAds]);
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
      setOpenActionMenuId(null);
      await fetchAds();
    } catch (err) {
      setError(err.message || "Failed to update status.");
    } finally {
      setReviewingId(null);
    }
  };

  const confirmDelete = async () => {
    const id = deleteConfirm.id;
    if (!id) return;
    setDeleting(true);
    try {
      await apiRequest(`/advertisements/${id}`, { method: "DELETE" });
      setDeleteConfirm({ open: false, id: null });
      await fetchAds();
    } catch (err) {
      setError(err.message || "Failed to delete advertisement.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredAds = ads.filter((ad) => {
    const matchesFilter = filter === "all" || ad.status === filter;
    const q = searchTerm.trim().toLowerCase();
    const haystack = [getName(ad), getEmail(ad), getPhone(ad), getPurpose(ad), ad.paymentMethod, ad.paymentReference]
      .filter(Boolean).join(" ").toLowerCase();
    return matchesFilter && (!q || haystack.includes(q));
  });

  const totalItems = filteredAds.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const safePage = Math.min(page, totalPages);
  const paginatedAds = filteredAds.slice((safePage - 1) * limit, safePage * limit);

  useEffect(() => { setPage(1); }, [filter, searchTerm, limit]);

  const statusConfig = {
    pending: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "Pending", icon: Clock },
    approved: { color: "text-green-600", bg: "bg-green-50", border: "border-green-200", label: "Approved", icon: CheckCircle },
    rejected: { color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "Rejected", icon: XCircle },
    expired: { color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200", label: "Expired", icon: Clock },
  };

  const renderStatusBadge = (status) => {
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${config.bg} ${config.color} ${config.border}`}><Icon size={12} />{config.label}</span>;
  };

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Megaphone size={28} className="text-blue-500" />Advertisements</h2>
          <p className="mt-1 text-sm text-slate-500">Review payments, media, and advertisement submissions.</p>
        </div>
        <button onClick={fetchAds} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"><Clock size={16} />Refresh</button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {["total", "pending", "approved", "rejected"].map((key) => {
          const meta = { total: ["Total", "text-slate-700", "bg-white", "border-slate-200"], pending: ["Pending", "text-amber-600", "bg-amber-50", "border-amber-200"], approved: ["Approved", "text-green-600", "bg-green-50", "border-green-200"], rejected: ["Rejected", "text-red-600", "bg-red-50", "border-red-200"] }[key];
          return <div key={key} className={`rounded-xl border ${meta[3]} ${meta[2]} p-4`}><p className="text-xs font-medium uppercase tracking-wider text-slate-500">{meta[0]}</p><p className={`mt-1 text-2xl font-bold ${meta[1]}`}>{stats[key]}</p></div>;
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <Filter size={16} className="text-slate-400" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-transparent text-sm text-slate-700 outline-none">
            <option value="all">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name, email, phone, or purpose..." className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={16} /></button>}
        </div>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertTriangle size={16} />{error}</div>}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16"><Loader2 size={40} className="mb-3 animate-spin text-blue-500" /><p className="text-slate-500">Loading advertisements...</p></div>
      ) : filteredAds.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center"><Megaphone size={48} className="mx-auto mb-3 text-slate-300" /><p className="font-medium text-slate-500">No advertisements found</p></div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedAds.map((ad) => {
              const aid = String(ad.id || ad._id);
              const effectiveStatus = statusConfig[ad.status] ? ad.status : "pending";
              const submitter = ad.workerId || ad.customerId || null;
              const submitterType = ad.submitterType || (ad.workerId ? "worker" : ad.customerId ? "customer" : "guest");
              const picUrl = ad.submitterProfilePicture || submitter?.profilePicture ? getMediaUrl(ad.submitterProfilePicture || submitter?.profilePicture) : "";
              const showPic = Boolean(picUrl) && !brokenAvatars[aid];
              const files = getFiles(ad);
              const isVideo = ad.adType === "video";
              return (
                <div key={aid} className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg">
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {showPic ? <img src={picUrl} alt="" className="h-12 w-12 shrink-0 rounded-full border-2 border-blue-100 object-cover" onError={() => setBrokenAvatars((p) => ({ ...p, [aid]: true }))} /> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-lg font-bold text-white">{getName(ad).charAt(0).toUpperCase()}</div>}
                        <div className="min-w-0"><h3 className="truncate font-semibold text-slate-900">{getName(ad)}</h3><p className="truncate text-sm text-slate-500">{getEmail(ad)}</p></div>
                      </div>
                      {renderStatusBadge(effectiveStatus)}
                    </div>

                    <div className="flex flex-1 flex-col space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-700"><FileText size={16} className="text-blue-500" /><span className="truncate">{getPurpose(ad)}</span></div>
                      <p className="line-clamp-3 text-slate-600">{getPurpose(ad)}</p>
                      <div className="flex items-center gap-2 text-slate-700"><Phone size={16} className="text-blue-500" /><span>{getPhone(ad) || "—"}</span></div>
                      <div className="flex flex-wrap items-center gap-2 text-slate-700"><CreditCard size={16} className="text-blue-500" /><span className="capitalize">{ad.paymentMethod || "—"}</span><span>• Rs {Number(ad.price ?? ad.budget ?? 0).toLocaleString("en-PK")}</span></div>
                      {ad.paymentReference && <p className="truncate text-xs text-slate-500">Reference: {ad.paymentReference}</p>}
                      <div className="flex items-center gap-2 text-slate-700"><Clock size={16} className="text-blue-500" /><span>Expires {ad.expiresAt ? new Date(ad.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "after approval"}</span></div>

                      <div className="mt-3">
                        {files.length ? <div className="grid grid-cols-3 gap-2">{files.slice(0, 3).map((url, idx) => <div key={`${url}-${idx}`} className="relative">{isVideo ? <video src={getMediaUrl(url)} className="h-20 w-full rounded-lg border border-slate-200 bg-slate-900 object-contain" muted preload="metadata" /> : <img src={getMediaUrl(url)} alt={`Advertisement ${idx + 1}`} className="h-20 w-full cursor-pointer rounded-lg border border-slate-200 object-cover hover:opacity-90" onClick={() => setPreviewModal({ ...ad, previewIndex: idx })} />}</div>)}</div> : <div className="flex h-20 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-400">No media</div>}
                      </div>

                      {ad.paymentReceiptUrl && <button onClick={() => setPreviewModal({ ...ad, receiptPreview: true })} className="inline-flex items-center gap-2 text-left text-xs font-semibold text-blue-700 hover:text-blue-900"><CreditCard size={14} />View payment receipt</button>}
                      {ad.adminNote && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"><span className="font-semibold text-slate-700">Admin Note:</span> {ad.adminNote}</div>}
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><div><p className="text-xs uppercase text-slate-500">Submitted</p><p className="text-sm font-semibold text-slate-900">{ad.createdAt ? new Date(ad.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</p></div><div className="text-right text-xs text-slate-500"><p>{ad.createdAt ? new Date(ad.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}</p><p className="capitalize">{submitterType}</p></div></div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                      <button onClick={() => setPreviewModal({ ...ad, previewIndex: 0 })} className="flex flex-1 items-center justify-center rounded-xl bg-blue-100 px-4 py-3 text-blue-700 hover:bg-blue-200" title="Preview"><Eye size={20} /></button>
                      <div className="relative"><button onClick={() => setOpenActionMenuId((p) => p === aid ? null : aid)} className="rounded-xl bg-slate-100 px-4 py-3 text-slate-700 hover:bg-slate-200" title="More actions"><MoreVertical size={20} /></button>
                        {openActionMenuId === aid && <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                          {effectiveStatus === "pending" && <><button onClick={() => handleStatusUpdate(aid, "approved")} disabled={reviewingId === aid} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-60">Approve & publish</button><button onClick={() => { setOpenActionMenuId(null); setSelectedAd(ad); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50">Reject</button></>}
                          <button onClick={() => { setOpenActionMenuId(null); setDeleteConfirm({ open: true, id: aid }); }} className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50">Delete</button>
                        </div>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {totalItems > limit && <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} limit={limit} onLimitChange={(n) => { setLimit(n); setPage(1); }} totalItems={totalItems} />}
        </>
      )}

      {selectedAd && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"><div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-4"><h3 className="text-lg font-bold text-slate-900">Reject Advertisement</h3><p className="mt-1 text-sm text-slate-500">From: {getName(selectedAd)} — {getEmail(selectedAd)}</p></div><label className="mb-1.5 block text-sm font-medium text-slate-700">Rejection Reason</label><textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} maxLength={500} placeholder="Enter a reason for rejection..." rows={3} className="mb-4 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" /><div className="flex gap-3"><button onClick={() => { setSelectedAd(null); setReviewNote(""); }} className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button><button onClick={() => handleStatusUpdate(selectedAd.id || selectedAd._id, "rejected")} disabled={reviewingId === String(selectedAd.id || selectedAd._id)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60">{reviewingId === String(selectedAd.id || selectedAd._id) ? <Loader2 size={16} className="animate-spin" /> : <ThumbsDown size={16} />}Confirm Reject</button></div></div></div>}

      {previewModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm" onClick={() => setPreviewModal(null)}><div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-200 px-5 py-3"><div className="flex items-center gap-2">{previewModal.receiptPreview ? <CreditCard size={18} className="text-blue-500" /> : previewModal.adType === "video" ? <Video size={18} className="text-blue-500" /> : <ImageIcon size={18} className="text-blue-500" />}<span className="text-sm font-semibold text-slate-900">{previewModal.receiptPreview ? "Payment receipt" : `${getName(previewModal)}'s Advertisement`}</span></div><button onClick={() => setPreviewModal(null)} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"><X size={18} /></button></div><div className="p-5">{previewModal.receiptPreview ? <img src={getMediaUrl(previewModal.paymentReceiptUrl)} alt="Payment receipt" className="mx-auto max-h-[70vh] max-w-full rounded-lg bg-slate-100 object-contain" /> : getFiles(previewModal).length ? (previewModal.adType === "video" ? <video src={getMediaUrl(getFiles(previewModal)[previewModal.previewIndex || 0])} controls autoPlay playsInline className="mx-auto max-h-[65vh] max-w-full rounded-lg bg-slate-900" /> : <img src={getMediaUrl(getFiles(previewModal)[previewModal.previewIndex || 0])} alt="Advertisement" className="mx-auto max-h-[65vh] max-w-full rounded-lg bg-slate-100 object-contain" />) : <div className="flex h-64 items-center justify-center rounded-lg bg-slate-100 text-slate-400">No media available</div>}{!previewModal.receiptPreview && getFiles(previewModal).length > 1 && <div className="mt-4 flex flex-wrap justify-center gap-2">{getFiles(previewModal).map((_, idx) => <button key={idx} onClick={() => setPreviewModal({ ...previewModal, previewIndex: idx })} className={`h-2 rounded-full transition-all ${(previewModal.previewIndex || 0) === idx ? "w-6 bg-blue-500" : "w-2 bg-blue-200"}`} />)}</div>}{!previewModal.receiptPreview && <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{getPurpose(previewModal)}</p><p className="mt-1 text-sm text-slate-700">{getEmail(previewModal)}{getPhone(previewModal) ? ` • ${getPhone(previewModal)}` : ""}</p></div>}</div></div></div>}

      <ConfirmDialog open={deleteConfirm.open} title="Delete advertisement?" message="This advertisement will be hidden from the platform. This action can be reversed only through the database." confirmLabel="Delete" loading={deleting} onCancel={() => setDeleteConfirm({ open: false, id: null })} onConfirm={confirmDelete} />
    </div>
  );
}
