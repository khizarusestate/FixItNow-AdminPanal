import {
  Search,
  Plus,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  X,
  Loader2,
  Save,
  AlertTriangle,
  Phone,
  MapPin,
  MoreVertical
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { apiRequest, paginatedRequest } from '../lib/api'
import { resolveMediaUrl } from '../lib/media'
import { useRefresh } from '../context/SocketContext'
import LocationPicker from './LocationPicker.jsx'
import { geoFromUser } from '../utils/location.js'

const emptyGeo = { location: '', latitude: null, longitude: null, placeId: '' }
import Pagination from './Pagination'
import { RefreshCw } from 'lucide-react'
import ListToolbar, { StatCard } from './shared/ListToolbar'

const SERVICE_CATEGORIES = [
  'Cleaning',
  'Home Repair',
  'Electrical',
  'Plumbing',
  'Automotive',
  'IT Support',
  'Other'
]

const getServiceNames = (payload) => {
  const services = payload?.data?.services || payload?.services || []
  const names = services.map((service) => service.name).filter(Boolean)
  return names.length > 0 ? names : SERVICE_CATEGORIES
}

const STATUS_LABELS = {
  not_approved: 'Pending',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  active: 'Online',
  inactive: 'Offline'
}

const blankForm = {
  fullName: '',
  email: '',
  phoneNumber: '',
  serviceCategory: '',
  serviceArea: '',
  address: '',
  password: '',
  cnic: '',
  availability: true,
  status: 'approved',
}

const normalizeWorker = (worker = {}) => ({
  _id: worker._id || worker.id,
  fullName: worker.fullName || '',
  email: worker.emailAddress || worker.email || '',
  phone: worker.phoneNumber || worker.phone || '',
  service: worker.serviceCategory || worker.service || '',
  location: worker.location || worker.serviceArea || worker.address || '',
  serviceArea: worker.serviceArea || worker.location || '',
  address: worker.address || worker.location || '',
  latitude: worker.latitude ?? null,
  longitude: worker.longitude ?? null,
  cnic: worker.cnicNumber || worker.cnic || '',
  profilePicture: worker.profilePicture || '',
  verificationPhoto: worker.verificationPhoto || '',
  availability: worker.availability ?? true,
  status: worker.status || 'not_approved',
  isDisabled: worker.isDisabled ?? false,
  isOnline: worker.isOnline ?? false,
  joinDate: worker.joinDate || worker.createdAt,
  lastActive: worker.lastActive,
  createdAt: worker.createdAt,
  updatedAt: worker.updatedAt,
})

const workerSortPriority = (worker) => {
  const status = worker.status
  if (status === 'not_approved' || status === 'pending') return 0
  if (status === 'approved' || status === 'active') return 1
  if (status === 'rejected') return 2
  if (status === 'inactive') return 3
  return 4
}

const sortWorkerList = (list) =>
  [...list].sort((a, b) => {
    const aOnline = a?.isDisabled ? 0 : a?.isOnline ? 1 : 0
    const bOnline = b?.isDisabled ? 0 : b?.isOnline ? 1 : 0
    if (aOnline !== bOnline) return bOnline - aOnline
    const p = workerSortPriority(a) - workerSortPriority(b)
    if (p !== 0) return p
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
  })

const getPresenceLabel = (worker) => {
  if (worker.isDisabled) return 'Non-active'
  if (worker.status === 'not_approved' || worker.status === 'pending') return 'Pending'
  if (worker.status === 'rejected') return 'Rejected'
  if (worker.status === 'approved' || worker.status === 'active' || worker.status === 'inactive') {
    return worker.isOnline ? 'Online' : 'Offline'
  }
  return STATUS_LABELS[worker.status] || worker.status
}

const getPresenceColor = (worker) => {
  if (worker.isDisabled) return 'bg-red-100 text-red-800'
  if (worker.status === 'not_approved' || worker.status === 'pending') {
    return 'bg-yellow-100 text-yellow-800'
  }
  if (worker.status === 'rejected') return 'bg-red-100 text-red-800'
  if (worker.isOnline) return 'bg-green-100 text-green-800'
  return 'bg-gray-100 text-gray-800'
}

const formatDateTime = (value) => {
  if (!value) return 'N/A'
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatRelativeTime = (value) => {
  if (!value) return null
  const t = new Date(value).getTime()
  if (Number.isNaN(t)) return null
  const diffMs = Date.now() - t
  const diffSec = Math.max(0, Math.floor(diffMs / 1000))
  if (diffSec < 60) return `${diffSec}s`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hr`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay} day`
}

const getActiveLine = (worker) => {
  if (worker?.isDisabled) return 'Disabled'
  if (worker?.isOnline) return 'Active now'
  const rel = formatRelativeTime(worker?.lastActive)
  return rel ? `Active ${rel} ago` : 'Active: N/A'
}

const getActiveLineClasses = (worker) => {
  if (worker?.isDisabled) {
    return {
      wrap: 'bg-red-50 text-red-700 ring-1 ring-red-100',
      dot: 'bg-red-500',
    }
  }
  if (worker?.isOnline) {
    return {
      wrap: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 shadow-sm',
      dot: 'bg-emerald-500 animate-pulse',
    }
  }
  return {
    wrap: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    dot: 'bg-slate-400',
  }
}

function WorkerAvatar({ worker, size = 'md' }) {
  const sizeClass = size === 'lg' ? 'h-20 w-20 text-3xl' : size === 'sm' ? 'h-10 w-10 text-base' : 'h-12 w-12 text-xl'

  const pic = resolveMediaUrl(worker?.profilePicture)
  if (pic) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden border-2 border-blue-100 shadow-sm flex-shrink-0`}>
        <img
          src={pic}
          alt={worker.fullName || 'Worker'}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-sm border-2 border-blue-100`}>
      {worker?.fullName?.charAt(0)?.toUpperCase() || '?'}
    </div>
  )
}

export default function Workers() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [error, setError] = useState('')
  const [workers, setWorkers] = useState([])
  const [, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingWorker, setEditingWorker] = useState(null)
  const [viewingWorker, setViewingWorker] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, worker: null })
  const [formData, setFormData] = useState(blankForm)
  const [workerGeo, setWorkerGeo] = useState(emptyGeo)
  const [serviceOptions, setServiceOptions] = useState(SERVICE_CATEGORIES)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [sort, setSort] = useState('-createdAt')
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 })
  const [openActionMenuId, setOpenActionMenuId] = useState(null)

  const WORKER_STATUS_OPTIONS = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ]

  const fetchWorkers = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const params = {
        page,
        limit,
        sort,
        ...(searchTerm && { search: searchTerm }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
        ...(dateFrom && { startDate: dateFrom }),
        ...(dateTo && { endDate: dateTo }),
      }

      const response = await paginatedRequest('/admin/workers', params)
      const mapped = (response?.data?.workers || response?.data || []).map(normalizeWorker)

      setWorkers(sortWorkerList(mapped))
      setTotalPages(response?.pagination?.totalPages || 1)
      setTotalItems(response?.pagination?.total || 0)
      if (response?.stats) setStats(response.stats)
    } catch (err) {
      setError(err.message || 'Failed to fetch workers')
    } finally {
      setLoading(false)
    }
  }, [page, limit, sort, searchTerm, filterStatus, dateFrom, dateTo])

  const fetchServices = useCallback(async () => {
    try {
      const response = await apiRequest('/admin/services')
      setServiceOptions(getServiceNames(response))
    } catch {
      setServiceOptions(SERVICE_CATEGORIES)
    }
  }, [])

  useEffect(() => {
    fetchWorkers()
    fetchServices()
  }, [fetchWorkers, fetchServices])

  useEffect(() => {
    setPage(1)
  }, [searchTerm, filterStatus, dateFrom, dateTo])

  useRefresh('workers', fetchWorkers)

  const openAddModal = () => {
    setEditingWorker(null)
    setFormData(blankForm)
    setWorkerGeo(emptyGeo)
    setIsModalOpen(true)
  }

  const handleEdit = (worker) => {
    setEditingWorker(worker)
    setFormData({
      fullName: worker.fullName || '',
      email: worker.email || '',
      phoneNumber: worker.phone || '',
      serviceCategory: worker.service || '',
      password: '',
      cnic: worker.cnic || '',
      availability: worker.availability ?? true,
      status: worker.status || 'approved',
    })
    setWorkerGeo(geoFromUser(worker))
    setIsModalOpen(true)
  }

  const handleView = async (worker) => {
    try {
      const response = await apiRequest(`/admin/workers/${worker._id}`)
      setViewingWorker(normalizeWorker(response.data))
    } catch (err) {
      setViewingWorker(worker)
      setError(err.message || 'Failed to load latest worker details')
    }
  }

  const handleStatusChange = async (id, status, extra = {}) => {
    try {
      const body = { ...extra }
      if (status) body.status = status
      await apiRequest(`/admin/workers/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      })
      await fetchWorkers()
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to update worker status')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const statusToSave =
      formData.status === 'pending' ? 'not_approved' : formData.status

    const submitData = {
      fullName: formData.fullName,
      emailAddress: formData.email,
      phoneNumber: formData.phoneNumber,
      serviceCategory: formData.serviceCategory,
      location: workerGeo.location?.trim() || '',
      latitude: workerGeo.latitude,
      longitude: workerGeo.longitude,
      placeId: workerGeo.placeId,
      cnicNumber: formData.cnic,
      availability: formData.availability,
      status: statusToSave,
    }

    if (formData.password) {
      submitData.password = formData.password
    }

    try {
      if (editingWorker) {
        await apiRequest(`/admin/workers/${editingWorker._id}`, {
          method: 'PUT',
          body: JSON.stringify(submitData)
        })
      } else {
        await apiRequest('/admin/workers', {
          method: 'POST',
          body: JSON.stringify({ ...submitData, password: formData.password })
        })
      }

      await fetchWorkers()
      setIsModalOpen(false)
      setEditingWorker(null)
      setFormData(blankForm)
    } catch (err) {
      setError(err.message || 'Failed to save worker')
    } finally {
      setSaving(false)
    }
  }

  const confirmDeleteWorker = async () => {
    if (!deleteConfirm.worker) return
    setDeleting(true)
    setError('')

    try {
      await apiRequest(`/admin/workers/${deleteConfirm.worker._id}`, { method: 'DELETE' })
      await fetchWorkers()
      setDeleteConfirm({ open: false, worker: null })
    } catch (err) {
      setError(err.message || 'Failed to delete worker')
    } finally {
      setDeleting(false)
    }
  }

  const handleSort = (field) => {
    const newSort = sort === field ? `-${field}` : field
    setSort(newSort)
  }

  const handleRetry = () => {
    fetchWorkers()
  }

  const isWorkerApproved = (worker) =>
    ['approved', 'active', 'inactive'].includes(worker.status)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={20} />
          Add Worker
        </button>
      </div>

      {stats.pending > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>{stats.pending}</strong> worker{stats.pending === 1 ? '' : 's'} pending approval — review and approve or reject below.
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-red-50 px-4 py-2 text-red-600">
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

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={<Clock size={18} />}
          color="yellow"
          active={filterStatus === 'pending'}
          onClick={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')}
        />
        <StatCard
          title="Approved"
          value={stats.approved}
          icon={<CheckCircle size={18} />}
          color="green"
          active={filterStatus === 'approved'}
          onClick={() => setFilterStatus(filterStatus === 'approved' ? 'all' : 'approved')}
        />
        <StatCard
          title="Rejected"
          value={stats.rejected}
          icon={<XCircle size={18} />}
          color="red"
          active={filterStatus === 'rejected'}
          onClick={() => setFilterStatus(filterStatus === 'rejected' ? 'all' : 'rejected')}
        />
      </div>

      <ListToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search workers by name, email, service or area..."
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        statusOptions={WORKER_STATUS_OPTIONS}
        showDateFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onClearDates={() => {
          setDateFrom('')
          setDateTo('')
        }}
        onSort={() => handleSort('createdAt')}
        sortLabel={sort.startsWith('-') ? 'Newest first' : 'Oldest first'}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {workers.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No workers found</h3>
            <p className="text-slate-500">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          workers.map((worker) => (
            <div key={worker._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 group">
              {/* Worker Header */}
              <div className="relative p-6 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
                <div className="flex items-start gap-4">
                  <WorkerAvatar worker={worker} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {worker.fullName}
                    </h3>
                    <p className="text-sm text-slate-500 truncate mt-1">{worker.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                        {worker.service || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Worker Details */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400" />
                    <span className="text-slate-600 truncate">{worker.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400" />
                    <span className="text-slate-600 truncate">{worker.serviceArea || 'N/A'}</span>
                  </div>
                </div>

                {isWorkerApproved(worker) && (
                  <div className={`rounded-lg px-3 py-2 text-sm ${getActiveLineClasses(worker).wrap}`}>
                    <p className="font-semibold inline-flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${getActiveLineClasses(worker).dot}`} />
                      {getActiveLine(worker)}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleView(worker)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                  >
                    <Eye size={16} />
                  </button>
                  {!isWorkerApproved(worker) ? (
                    <>
                      <button
                        onClick={() => handleStatusChange(worker._id, 'approved')}
                        className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                        title="Approve"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ open: true, worker })}
                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        title="Delete account"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenActionMenuId((prev) => (prev === worker._id ? null : worker._id))
                        }
                        className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                        title="More actions"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openActionMenuId === worker._id && (
                        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white shadow-lg z-50">
                          <button
                            onClick={() => {
                              setOpenActionMenuId(null)
                              handleEdit(worker)
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setOpenActionMenuId(null)
                              setDeleteConfirm({ open: true, worker })
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => {
                              setOpenActionMenuId(null)
                              handleStatusChange(worker._id, null, { isDisabled: !worker.isDisabled })
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                          >
                            {worker.isDisabled ? 'Enable account' : 'Disable account'}
                          </button>
                        </div>
                      )}
                    </div>
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
            setLimit(newLimit)
            setPage(1)
          }}
          totalItems={totalItems}
        />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-950">
                {editingWorker ? 'Edit Worker' : 'Add Worker'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                  placeholder="Worker full name"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={formData.phoneNumber}
                    onChange={(event) => setFormData((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                    placeholder="03XX-XXXXXXX"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Work</label>
                  <select
                    required
                    value={formData.serviceCategory}
                    onChange={(event) => setFormData((prev) => ({ ...prev, serviceCategory: event.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
                  >
                    <option value="">Select Work</option>
                    {serviceOptions.map((service) => (
                      <option key={service} value={service}>{service}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
                  >
                    <option value="not_approved">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="active">Online</option>
                    <option value="inactive">Offline</option>
                  </select>
                </div>
              </div>

              <LocationPicker
                label="Location"
                required
                value={workerGeo}
                onChange={setWorkerGeo}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CNIC</label>
                <input
                  type="text"
                  required
                  value={formData.cnic}
                  onChange={(event) => setFormData((prev) => ({ ...prev, cnic: event.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                  placeholder="XXXXX-XXXXXXX-X"
                />
              </div>

              <div className="flex items-end">
                <label className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.availability}
                    onChange={(event) => setFormData((prev) => ({ ...prev, availability: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-blue-500"
                  />
                  Available for work
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password {editingWorker && <span className="text-slate-500 font-normal">(leave blank to keep unchanged)</span>}
                </label>
                <input
                  type="password"
                  required={!editingWorker}
                  value={formData.password}
                  onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                  placeholder={editingWorker ? 'Keep current password' : 'Set password'}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {editingWorker ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setViewingWorker(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-950">Worker Details</h2>
              <button onClick={() => setViewingWorker(null)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <WorkerAvatar worker={viewingWorker} size="lg" />
              <div>
                <h3 className="font-semibold text-2xl text-slate-900">{viewingWorker.fullName || 'N/A'}</h3>
                <p className="text-sm text-slate-500">{viewingWorker.email || 'No email'}</p>
                <span
                  className={`mt-2 inline-flex px-2.5 py-1 text-xs rounded-full ${getPresenceColor(viewingWorker)}`}
                >
                  {getPresenceLabel(viewingWorker)}
                </span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <DetailItem label="Full Name" value={viewingWorker.fullName || 'N/A'} />
              <DetailItem label="Email Address" value={viewingWorker.email || 'N/A'} />
              <DetailItem label="Phone Number" value={viewingWorker.phone || 'N/A'} />
              <DetailItem label="Location" value={viewingWorker.location || viewingWorker.serviceArea || 'N/A'} />
              <DetailItem label="Selected Work" value={viewingWorker.service || 'N/A'} />
              <DetailItem label="CNIC" value={viewingWorker.cnic || 'N/A'} />
              <DetailItem label="Availability" value={viewingWorker.availability ? 'Available' : 'Not Available'} />
              <DetailItem label="Worker Since" value={formatDateTime(viewingWorker.joinDate)} />
              <DetailItem label="Last Active" value={formatDateTime(viewingWorker.lastActive)} />
            </div>

            {/* Profile Pictures Section */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4">Photos & Documents</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Profile Picture */}
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Profile Picture</p>
                  {viewingWorker.profilePicture ? (
                    <img 
                      src={resolveMediaUrl(viewingWorker.profilePicture)} 
                      alt="Profile" 
                      className="w-full h-48 object-cover rounded-lg border border-slate-200"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-full h-48 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                      <span className="text-slate-400 text-sm">No photo</span>
                    </div>
                  )}
                </div>

                {/* Verification Photo */}
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Passport/Verification</p>
                  {viewingWorker.verificationPhoto ? (
                    <img 
                      src={resolveMediaUrl(viewingWorker.verificationPhoto)} 
                      alt="Verification" 
                      className="w-full h-48 object-cover rounded-lg border border-slate-200"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-full h-48 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                      <span className="text-slate-400 text-sm">No photo</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-6">
              <button
                onClick={() => {
                  const currentWorker = viewingWorker
                  setViewingWorker(null)
                  handleEdit(currentWorker)
                }}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Edit Worker
              </button>
              <button
                onClick={() => setViewingWorker(null)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm.open && deleteConfirm.worker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Delete Worker?</h2>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete <strong>{deleteConfirm.worker.fullName}</strong>?
              This action cannot be undone and the worker account will be permanently removed.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteConfirm({ open: false, worker: null })}
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteWorker}
                disabled={deleting}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 min-w-0">
      <p className="text-xs uppercase font-medium text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-900 break-words">{value}</p>
    </div>
  )
}

function Stat({ title, value, icon }) {
  return (
    <div className="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
      <div className="text-gray-400">{icon}</div>
    </div>
  )
}
