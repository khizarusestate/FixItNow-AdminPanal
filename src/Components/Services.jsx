import { Search, Plus, Edit, Trash2, Settings, TrendingUp, Users, DollarSign, X, Loader2 } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { apiRequest, paginatedRequest } from '../lib/api'
import { useRefresh } from '../context/SocketContext'
import Pagination from './Pagination'
import { ArrowUpDown, RefreshCw } from 'lucide-react'
import { pickServiceIcon, SERVICE_ICON_OPTIONS } from '../utils/serviceIcons.js'
import ConfirmDialog from './ConfirmDialog'

const FALLBACK_CATEGORIES = [
  'Home Maintenance',
  'Electrical Services',
  'Plumbing & Water',
  'Cleaning & Hygiene',
  'Appliance Repair',
]

export default function Services() {
  const [searchTerm, setSearchTerm] = useState('')
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null })
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    icon: 'Wrench',
    image: '',
    estimatedDuration: '',
    requirements: [],
    isActive: true
  })
  const [categories, setCategories] = useState([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [sort, setSort] = useState('-createdAt')
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [requirementInput, setRequirementInput] = useState('')
  const [viewTab, setViewTab] = useState('services')
  const [serviceRequests, setServiceRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [requestsError, setRequestsError] = useState('')
  const [pendingCount, setPendingCount] = useState(0)
  const [requestActionId, setRequestActionId] = useState(null)
  const [rejectingRequest, setRejectingRequest] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  // Fetch services
  const fetchServices = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const params = {
        page,
        limit,
        sort,
        ...(searchTerm && { search: searchTerm })
      }

      const res = await paginatedRequest('/admin/services', params)
      setServices(res.data?.services || [])
      const fromApi = res.data?.categories || []
      setCategories(fromApi.length ? fromApi : FALLBACK_CATEGORIES)
      setTotalPages(res?.pagination?.totalPages || 1)
      setTotalItems(res?.pagination?.total || 0)
    } catch (err) {
      setError(err.message || 'Failed to load services')
    } finally {
      setLoading(false)
    }
  }, [page, limit, sort, searchTerm])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  useEffect(() => {
    setPage(1)
  }, [searchTerm])

  // Real-time updates via Socket.IO
  useRefresh('services', fetchServices)

  // Fetch pending service requests (separate from the main services list)
  const fetchServiceRequests = useCallback(async () => {
    try {
      setRequestsLoading(true)
      setRequestsError('')
      const res = await paginatedRequest('/admin/service-requests', { status: 'pending', page: 1, limit: 50 })
      setServiceRequests(res.data || [])
      setPendingCount(res.pendingCount ?? (res.data || []).length)
    } catch (err) {
      setRequestsError(err.message || 'Failed to load service requests')
    } finally {
      setRequestsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServiceRequests()
  }, [fetchServiceRequests])

  useRefresh('service-requests', fetchServiceRequests)

  const [approvePriceOverrides, setApprovePriceOverrides] = useState({})

  const handleApproveRequest = async (id) => {
    setRequestActionId(id)
    try {
      const priceOverride = approvePriceOverrides[id]
      await apiRequest(`/admin/service-requests/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(priceOverride !== undefined ? { price: Number(priceOverride) } : {})
      })
      setApprovePriceOverrides((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      await fetchServiceRequests()
      await fetchServices()
    } catch (err) {
      setRequestsError(err.message || 'Failed to approve request')
    } finally {
      setRequestActionId(null)
    }
  }

  const handleRejectRequest = async () => {
    if (!rejectingRequest) return
    setRequestActionId(rejectingRequest._id || rejectingRequest.id)
    try {
      await apiRequest(`/admin/service-requests/${rejectingRequest._id || rejectingRequest.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason })
      })
      await fetchServiceRequests()
      setRejectingRequest(null)
      setRejectReason('')
    } catch (err) {
      setRequestsError(err.message || 'Failed to reject request')
    } finally {
      setRequestActionId(null)
    }
  }

  const handleAdd = () => {
    setEditingService(null)
    setFormData({
      name: '',
      description: '',
      category: '',
      price: '',
      icon: 'Wrench',
      image: '',
      estimatedDuration: '',
      requirements: [],
      isActive: true
    })
    setRequirementInput('')
    setIsModalOpen(true)
  }

  const handleEdit = (service) => {
    setEditingService(service)
    setFormData({
      name: service.name || '',
      description: service.description || '',
      category: service.category || '',
      price: service.price || '',
      icon: service.icon || pickServiceIcon(service.name, service.category),
      image: service.image || '',
      estimatedDuration: service.estimatedDuration || '',
      requirements: service.requirements || [],
      isActive: service.isActive !== false
    })
    setRequirementInput('')
    setIsModalOpen(true)
  }

  const handleDelete = (id) => {
    setDeleteConfirm({ open: true, id })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return
    setDeleting(true)
    try {
      await apiRequest(`/admin/services/${deleteConfirm.id}`, { method: 'DELETE' })
      setServices(prev => prev.filter(s => (s.id || s._id) !== deleteConfirm.id))
      setDeleteConfirm({ open: false, id: null })
    } catch (err) {
      setError(err.message || 'Failed to delete service')
    } finally {
      setDeleting(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        icon: formData.icon || pickServiceIcon(formData.name, formData.category),
        price: Number(formData.price) || 0
      }
      
      if (editingService) {
        const res = await apiRequest(`/admin/services/${editingService.id || editingService._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        })
        setServices(prev => prev.map(s => (s.id || s._id) === (editingService.id || editingService._id) ? res.data : s))
      } else {
        const res = await apiRequest('/admin/services', {
          method: 'POST',
          body: JSON.stringify(payload)
        })
        setServices(prev => [...prev, res.data])
      }
      setIsModalOpen(false)
      setEditingService(null)
    } catch (err) {
      setError(err.message || 'Failed to save service')
    }
  }

  const handleSort = (field) => {
    const newSort = sort === field ? `-${field}` : field
    setSort(newSort)
  }

  const handleRetry = () => {
    fetchServices()
  }

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600'
    if (rating >= 4.0) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusColor = (isActive) => {
    return isActive 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800'
  }

  const totalWorkers = services.reduce((acc, s) => acc + (s.activeWorkers || 0), 0)
  const totalBookings = services.reduce((acc, s) => acc + (s.totalBookings || 0), 0)
  const avgPrice = services.length > 0 
    ? Math.round(services.reduce((acc, s) => acc + (s.price || 0), 0) / services.length)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Services</h1>
          <p className="text-slate-600 mt-2">Manage service categories and pricing</p>
        </div>
        {viewTab === 'services' && (
          <button 
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus size={20} />
            Add Service
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setViewTab('services')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            viewTab === 'services'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Active Services
        </button>
        <button
          onClick={() => setViewTab('requests')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            viewTab === 'requests'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Pending Requests
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-xs font-semibold">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {viewTab === 'services' && (
      <>
      {error && (
        <div className="flex items-center justify-between gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
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

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex gap-4 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
            />
          </div>
          <button
            onClick={() => handleSort('price')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-all"
          >
            <ArrowUpDown size={16} />
            Price
          </button>
        </div>
      </div>

      {/* Service Overview */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-950">Service Overview</h2>
        </div>
        <div className="p-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full">
                <Settings className="text-blue-600" size={32} />
              </div>
              <p className="text-2xl font-bold text-slate-950">{services.length}</p>
              <p className="text-sm text-slate-600">Total Services</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
                <Users className="text-green-600" size={32} />
              </div>
              <p className="text-2xl font-bold text-slate-950">{totalWorkers}</p>
              <p className="text-sm text-slate-600">Active Workers</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full">
                <TrendingUp className="text-purple-600" size={32} />
              </div>
              <p className="text-2xl font-bold text-slate-950">{totalBookings}</p>
              <p className="text-sm text-slate-600">Total Bookings</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full">
                <DollarSign className="text-blue-600" size={32} />
              </div>
              <p className="text-2xl font-bold text-slate-950">₨{avgPrice.toLocaleString()}</p>
              <p className="text-sm text-slate-600">Avg Price</p>
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-24 mb-4" />
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
            </div>
          ))
        ) : (
          services.map((service) => (
            <div key={service.id || service._id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <span className="text-xl font-bold">{service.name?.[0] || 'S'}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{service.name}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(service.isActive)}`}>
                        {service.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-600 mb-2 line-clamp-2">{service.description}</p>
                <p className="text-xs text-slate-500 mb-2">{service.category || 'N/A'}</p>
                {service.estimatedDuration && (
                  <p className="text-xs text-blue-600 mb-2">⏱️ {service.estimatedDuration}</p>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-950">{service.activeWorkers || 0}</p>
                    <p className="text-xs text-slate-600">Active Workers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-950">{service.totalBookings || 0}</p>
                    <p className="text-xs text-slate-600">Total Bookings</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-slate-600">Rating:</span>
                    <span className={`text-lg font-bold ${getRatingColor(service.avgRating || 0)}`}>
                      {service.avgRating?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-600">Price</p>
                    <p className="text-lg font-bold text-slate-950">
                      ₨{service.price || 0}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEdit(service)}
                    className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(service.id || service._id)}
                    className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
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
      </>
      )}

      {viewTab === 'requests' && (
        <div className="space-y-4">
          {requestsError && (
            <div className="flex items-center justify-between gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <span>{requestsError}</span>
              <button
                onClick={fetchServiceRequests}
                className="flex items-center gap-1 px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg text-red-700 transition-colors"
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          )}

          {requestsLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="animate-spin" size={28} />
            </div>
          ) : serviceRequests.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
              No pending service requests.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {serviceRequests.map((reqItem) => {
                const id = reqItem._id || reqItem.id
                const worker = reqItem.workerId || {}
                const isActing = requestActionId === id
                return (
                  <div key={id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">{reqItem.name}</h3>
                      <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">
                        {reqItem.category}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{reqItem.description}</p>
                    <div className="mb-3">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Price (PKR) {!reqItem.price && <span className="text-amber-600">— worker didn't set one, required to approve</span>}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={approvePriceOverrides[id] ?? reqItem.price ?? ''}
                        onChange={(e) => setApprovePriceOverrides((prev) => ({ ...prev, [id]: e.target.value }))}
                        placeholder="Set a price"
                        className={`w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none ${
                          !(approvePriceOverrides[id] ?? reqItem.price)
                            ? 'border-amber-300 bg-amber-50 focus:border-amber-400'
                            : 'border-slate-200 focus:border-blue-400'
                        }`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
                      {reqItem.estimatedDuration && <span>Duration: {reqItem.estimatedDuration}</span>}
                    </div>
                    {reqItem.requirements?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {reqItem.requirements.map((r, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-slate-500 border-t border-slate-100 pt-2.5 mb-3">
                      Requested by <span className="font-medium text-slate-700">{worker.fullName || 'Unknown worker'}</span>
                      {worker.phoneNumber && <> · {worker.phoneNumber}</>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveRequest(id)}
                        disabled={isActing || !(approvePriceOverrides[id] ?? reqItem.price)}
                        title={!(approvePriceOverrides[id] ?? reqItem.price) ? 'Set a price before approving' : ''}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isActing ? <Loader2 size={14} className="animate-spin" /> : 'Approve'}
                      </button>
                      <button
                        onClick={() => { setRejectingRequest(reqItem); setRejectReason('') }}
                        disabled={isActing}
                        className="flex-1 px-3 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-950">
                {editingService ? 'Edit Service' : 'Add Service'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setFormData(prev => ({
                      ...prev,
                      name,
                      icon: pickServiceIcon(name, prev.category),
                    }))
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                  placeholder="e.g. Electrical Repair"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 h-20 resize-none"
                  placeholder="Describe the service..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  required
                  list="service-category-suggestions"
                  value={formData.category}
                  onChange={(e) => {
                    const category = e.target.value
                    setFormData(prev => ({
                      ...prev,
                      category,
                      icon: pickServiceIcon(prev.name, category),
                    }))
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                  placeholder="Select an existing category or type a new one"
                />
                <datalist id="service-category-suggestions">
                  {(categories.length ? categories : FALLBACK_CATEGORIES).map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
                <p className="text-xs text-slate-500 mt-1">Pick a suggestion or type a brand-new category name.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price (₨)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                  placeholder="1500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Icon</label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                >
                  {SERVICE_ICON_OPTIONS.map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Auto-selected from service name; change if needed.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Duration</label>
                <input
                  type="text"
                  value={formData.estimatedDuration}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                  placeholder="e.g., 2-3 hours"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={formData.image || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                  placeholder="https://example.com/photo.jpg"
                />
                <p className="text-xs text-slate-500 mt-1">Optional — leave blank to use the icon instead.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Requirements</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={requirementInput}
                    onChange={(e) => setRequirementInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const val = requirementInput.trim()
                        if (val && !formData.requirements.includes(val)) {
                          setFormData(prev => ({ ...prev, requirements: [...prev.requirements, val] }))
                        }
                        setRequirementInput('')
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                    placeholder="e.g., Ladder access — press Enter to add"
                  />
                </div>
                {formData.requirements.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.requirements.map((req, idx) => (
                      <span key={`${req}-${idx}`} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full">
                        {req}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, requirements: prev.requirements.filter((_, i) => i !== idx) }))}
                          className="hover:text-red-600"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 text-blue-500 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
                  Active Service
                </label>
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
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  {editingService ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete service?"
        message="This service will be permanently removed from the menu. This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={confirmDelete}
      />

      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRejectingRequest(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <h3 className="font-semibold text-slate-900 mb-1">Reject "{rejectingRequest.name}"?</h3>
            <p className="text-sm text-slate-500 mb-3">Let the worker know why (optional).</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g., Too similar to an existing service"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 resize-none text-sm mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRejectingRequest(null)}
                className="flex-1 px-3 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectRequest}
                disabled={requestActionId === (rejectingRequest._id || rejectingRequest.id)}
                className="flex-1 px-3 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 disabled:opacity-60"
              >
                {requestActionId === (rejectingRequest._id || rejectingRequest.id) ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
