import { useState, useEffect } from 'react';
import {
  Star,
  MessageSquare,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  Loader2,
  AlertTriangle,
  User,
  Phone,
  FileText,
  Clock,
  Filter,
  Search,
  X,
  ThumbsUp,
  ThumbsDown,
  ArrowUpDown,
  RefreshCw
} from 'lucide-react';
import { apiRequest, paginatedRequest } from '../lib/api';
import { useRefresh } from '../context/SocketContext';
import Pagination from './Pagination';
import ConfirmDialog from './ConfirmDialog';
import { resolveUploadMediaUrl } from '../utils/mediaUrl.js';

const getImageUrl = (url) => resolveUploadMediaUrl(url);

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock, label: 'Pending' },
  approved: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle, label: 'Approved' },
  rejected: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: 'Rejected' }
};

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [brokenAvatars, setBrokenAvatars] = useState({});
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, averageRating: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReview, setSelectedReview] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const [previewModal, setPreviewModal] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [sort, setSort] = useState('-createdAt');
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [deleting, setDeleting] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit,
        sort,
        ...(searchTerm && { search: searchTerm }),
        ...(filter !== 'all' && { status: filter })
      };

      const [reviewsRes, statsRes] = await Promise.all([
        paginatedRequest('/app-reviews', params),
        apiRequest('/app-reviews/stats')
      ]);
      setReviews(reviewsRes.data || []);
      setStats(statsRes.data || { total: 0, pending: 0, approved: 0, rejected: 0, averageRating: 0 });
      const p = reviewsRes?.pagination;
      setTotalPages(p?.totalPages ?? 1);
      setTotalItems(p?.total ?? reviewsRes.count ?? (reviewsRes.data || []).length);
    } catch (err) {
      console.error('Failed to load reviews:', err);
      setError(err.message || 'Failed to load reviews.');
      setReviews([]);
      setStats({ total: 0, pending: 0, approved: 0, rejected: 0, averageRating: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [page, limit, sort, searchTerm, filter]);

  useRefresh('reviews', fetchReviews);

  const handleStatusUpdate = async (id, status) => {
    setReviewingId(id);
    try {
      await apiRequest(`/app-reviews/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNote: reviewNote })
      });
      await fetchReviews();
      setSelectedReview(null);
      setReviewNote('');
    } catch (err) {
      setError(err.message || 'Failed to update review status.');
    } finally {
      setReviewingId(null);
    }
  };

  const handleDelete = (id) => {
    setDeleteConfirm({ open: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    setDeleting(true);
    try {
      await apiRequest(`/app-reviews/${deleteConfirm.id}`, { method: "DELETE" });
      setDeleteConfirm({ open: false, id: null });
      await fetchReviews();
    } catch (err) {
      setError(err.message || 'Failed to delete review.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (field) => {
    const newSort = sort === field ? `-${field}` : field;
    setSort(newSort);
  };

  const handleRetry = () => {
    fetchReviews();
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}
      />
    ));
  };

  const renderStatusBadge = (status) => {
    const raw = status && statusConfig[status] ? status : 'pending';
    const config = statusConfig[raw] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${config.color} border`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">App Reviews</h1>
          <p className="text-sm text-slate-500 mt-1">Manage user reviews and ratings</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={20} className="text-slate-500" />
            <span className="text-sm font-medium text-slate-600">Total</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={20} className="text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">Pending</span>
          </div>
          <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={20} className="text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Approved</span>
          </div>
          <p className="text-2xl font-bold text-emerald-900">{stats.approved}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={20} className="text-red-600" />
            <span className="text-sm font-medium text-red-700">Rejected</span>
          </div>
          <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Star size={20} className="text-orange-600" />
            <span className="text-sm font-medium text-orange-700">Avg Rating</span>
          </div>
          <p className="text-2xl font-bold text-orange-900">{Number(stats.averageRating ?? 0).toFixed(1)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search reviews..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-slate-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
          >
            <option value="all">All Reviews</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={() => handleSort('rating')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-all"
          >
            <ArrowUpDown size={16} />
            Rating
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
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

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <MessageSquare size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No reviews found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {reviews.map(review => {
            const rid = String(review.id || review._id);
            const effectiveStatus = review.status === 'approved' || review.status === 'rejected' || review.status === 'pending'
              ? review.status
              : 'pending';
            const picUrl = review.submitterProfilePicture
              ? getImageUrl(review.submitterProfilePicture)
              : '';
            const showImg = picUrl && !brokenAvatars[rid];

            return (
              <div
                key={rid}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg"
              >
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {showImg ? (
                        <img
                          src={picUrl}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-full border-2 border-orange-100 object-cover"
                          onError={() =>
                            setBrokenAvatars((prev) => ({ ...prev, [rid]: true }))
                          }
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-lg font-bold text-white">
                          {review.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-900">
                          {review.name || 'Unknown'}
                        </h3>
                        <p className="truncate text-sm text-slate-500">
                          {review.email}
                        </p>
                      </div>
                    </div>

                    {renderStatusBadge(effectiveStatus)}
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Star size={16} className="text-orange-500" />
                      <div className="flex gap-0.5">
                        {renderStars(review.rating)}
                      </div>
                      <span className="text-slate-500">({review.rating}/5)</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                      <FileText size={16} className="text-orange-500" />
                      <span className="line-clamp-2">{review.comment}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone size={16} className="text-orange-500" />
                      <span>{review.phone || 'N/A'}</span>
                    </div>

                    {review.adminNote && (
                      <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
                        <span className="font-semibold text-slate-700">Admin Note:</span> {review.adminNote}
                      </div>
                    )}

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <div>
                        <p className="text-xs uppercase text-slate-500">
                          Submitted
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'N/A'}
                        </p>
                      </div>

                      <div className="text-right text-xs text-slate-500">
                        <p>{review.createdAt ? new Date(review.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}</p>
                        <p className="capitalize">{review.submitterType}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => setPreviewModal(review)}
                      className="flex flex-1 items-center justify-center rounded-xl bg-blue-100 px-4 py-3 text-blue-700 transition-colors hover:bg-blue-200"
                    >
                      <Eye size={20} />
                    </button>

                    {effectiveStatus === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(review.id || review._id, 'approved')}
                          disabled={reviewingId === (review.id || review._id)}
                          className="rounded-xl bg-emerald-500 px-4 py-3 text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
                        >
                          {reviewingId === (review.id || review._id) ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                        </button>
                        <button
                          onClick={() => setSelectedReview(review)}
                          className="rounded-xl bg-red-500 px-4 py-3 text-white transition-colors hover:bg-red-600"
                        >
                          <ThumbsDown size={20} />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleDelete(review.id || review._id)}
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

      {/* Reject Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Reject Review</h3>
              <button
                onClick={() => setSelectedReview(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-slate-600 mb-2">
                  <span className="font-semibold">Review by:</span> {selectedReview.name}
                </p>
                <p className="text-sm text-slate-600 mb-2">
                  <span className="font-semibold">Rating:</span> {selectedReview.rating}/5
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-semibold">Comment:</span> {selectedReview.comment}
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                  Admin Note (Optional)
                </label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Reason for rejection..."
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
                />
                <p className="mt-1 text-right text-xs text-slate-400">{reviewNote.length}/500</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleStatusUpdate(selectedReview.id || selectedReview._id, 'rejected')}
                  disabled={reviewingId === (selectedReview.id || selectedReview._id)}
                  className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-60"
                >
                  {reviewingId === (selectedReview.id || selectedReview._id) ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Reject'}
                </button>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Review Details</h3>
              <button
                onClick={() => setPreviewModal(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {previewModal.submitterProfilePicture ? (
                    <img
                      src={getImageUrl(previewModal.submitterProfilePicture)}
                      alt={previewModal.name}
                      className="h-12 w-12 rounded-full border-2 border-orange-100 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-lg font-bold text-white">
                      {previewModal.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">{previewModal.name}</p>
                    <p className="text-sm text-slate-500">{previewModal.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {renderStars(previewModal.rating)}
                  </div>
                  <span className="text-sm text-slate-600">({previewModal.rating}/5)</span>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <p className="text-sm text-slate-700">{previewModal.comment}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="text-slate-900">{previewModal.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Type</p>
                    <p className="text-slate-900 capitalize">{previewModal.submitterType}</p>
                  </div>
                </div>
                {previewModal.adminNote && (
                  <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
                    <span className="font-semibold text-slate-700">Admin Note:</span> {previewModal.adminNote}
                  </div>
                )}
                <div className="text-xs text-slate-500">
                  Submitted: {previewModal.createdAt ? new Date(previewModal.createdAt).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete review?"
        message="This review will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
