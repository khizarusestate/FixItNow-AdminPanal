import { User, Mail, Phone, MapPin, Calendar, Edit, Save, X, Shield, Camera, Lock, Eye, EyeOff } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiRequest } from '../lib/api'
import { resolveMediaUrl } from '../lib/media'
import LocationPicker from './LocationPicker.jsx'
import { geoFromUser } from '../utils/location.js'
import { fetchDevicePushPreference, registerWebPushAdmin, saveDevicePushPreference, unregisterWebPushAdmin, isPushSupported } from '../utils/pushNotifications.js'
import { useSocket } from '../context/SocketContext'

const roleLabel = (role) =>
  role === 'super_admin' ? 'Super Admin' : 'Admin';

export default function AdminProfile({ autoEdit = false, onAutoEditConsumed }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [profile, setProfile] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    role: 'admin',
    isActive: true,
    createdAt: '',
    lastLogin: '',
    profilePicture: ''
  })

  const [devicePushEnabled, setDevicePushEnabled] = useState(true)
  const [pushBusy, setPushBusy] = useState(false)
  
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [geo, setGeo] = useState(() => geoFromUser(null))
  const { connected } = useSocket()

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await apiRequest('/admin/me')
      const adminData = response.data
      
      setProfile({
        id: adminData.id || adminData._id,
        name: adminData.name || 'Admin User',
        email: adminData.email || 'admin@fixitnow.com',
        phone: adminData.phone || '+92 300 0000000',
        address: adminData.location || adminData.address || 'Office Address, Pakistan',
        role: adminData.role || 'admin',
        isActive: adminData.isActive ?? true,
        createdAt: adminData.createdAt || new Date().toISOString(),
        lastLogin: adminData.lastLogin || new Date().toISOString(),
        profilePicture: adminData.profilePicture || ''
      })
      
      setEditForm({
        name: adminData.name || 'Admin User',
        email: adminData.email || 'admin@fixitnow.com',
        phone: adminData.phone || '+92 300 0000000',
        address: adminData.location || adminData.address || 'Office Address, Pakistan',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })

      setGeo(geoFromUser(adminData))

      fetchDevicePushPreference()
        .then((enabled) => setDevicePushEnabled(enabled))
        .catch(() => {})
      
    } catch (err) {
      setError(err.message || 'Failed to fetch profile')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleDevicePush = async () => {
    const next = !devicePushEnabled
    setPushBusy(true)
    setError('')
    try {
      if (next) {
        const reg = await registerWebPushAdmin()
        if (!reg.ok) {
          setError(
            reg.reason === 'denied'
              ? 'Notifications blocked in browser settings.'
              : reg.reason === 'disabled'
                ? 'Push is not configured on the server yet.'
                : 'Could not enable notifications.',
          )
          setPushBusy(false)
          return
        }
      } else {
        await unregisterWebPushAdmin()
      }

      await saveDevicePushPreference(next)
      setDevicePushEnabled(next)
    } catch (err) {
      setError(err.message || 'Failed to update notification setting')
    } finally {
      setPushBusy(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    if (autoEdit && !loading && profile.name) {
      setEditForm({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setEditing(true);
      onAutoEditConsumed?.();
    }
  }, [autoEdit, loading, profile.name, profile.email, profile.phone, profile.address, onAutoEditConsumed]);

  const handleEdit = () => {
    setEditForm({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    setGeo(geoFromUser(profile))
    setEditing(true)
    setError('')
    setSuccess('')
  }

  const handleSave = async () => {
    if (!editForm.name || !editForm.email) {
      setError('Name and email are required')
      return
    }

    if (editForm.newPassword && editForm.newPassword !== editForm.confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (editForm.newPassword && editForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setSaving(true)
    setError('')
    
    try {
      const updateData = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        location: geo.location?.trim() || '',
        latitude: geo.latitude,
        longitude: geo.longitude,
        placeId: geo.placeId,
        address: geo.location?.trim() || editForm.address
      }

      // Only include password fields if new password is provided
      if (editForm.newPassword) {
        updateData.currentPassword = editForm.currentPassword
        updateData.newPassword = editForm.newPassword
      }

      await apiRequest('/admin/profile', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })

      setSuccess('Profile updated successfully!')
      setEditing(false)
      await fetchProfile()
      window.dispatchEvent(new Event('admin-profile-updated'));
      
      setTimeout(() => setSuccess(''), 3000)
      
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setError('')
    setSuccess('')
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    setSaving(true)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('profilePicture', file)

      await apiRequest('/admin/profile-picture', {
        method: 'POST',
        body: formData,
      })

      setSuccess('Profile picture updated successfully!')
      await fetchProfile()
      window.dispatchEvent(new Event('admin-profile-updated'));
      setTimeout(() => setSuccess(''), 3000)
      
    } catch (err) {
      setError(err.message || 'Failed to upload profile picture')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 mt-4">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Admin Profile</h1>
          <p className="text-slate-600 mt-1">Manage your admin account settings</p>
        </div>
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-600 px-4 py-2 rounded-lg text-sm">
            {success}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-b border-orange-200">
              <div className="text-center">
                <div className="relative inline-block">
                  {resolveMediaUrl(profile.profilePicture) ? (
                    <img
                      src={resolveMediaUrl(profile.profilePicture)}
                      alt={profile.name}
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
                      {profile.name?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                  )}
                  
                  {editing && (
                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-orange-600 transition-colors shadow-lg">
                      <Camera size={16} className="text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mt-4">{profile.name}</h3>
                <p className="text-sm text-slate-600">{roleLabel(profile.role)}</p>
                
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Shield size={16} className="text-orange-600" />
                  <span className="text-sm font-medium text-orange-600">
                    {profile.role === 'super_admin' ? 'Super Administrator' : 'Administrator'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">Notifications</p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={devicePushEnabled}
                  aria-label="Notifications"
                  disabled={pushBusy || !isPushSupported()}
                  onClick={handleToggleDevicePush}
                  className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${devicePushEnabled ? 'bg-orange-500' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform mt-0.5 ${devicePushEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-slate-400" />
                <span className="text-sm text-slate-600">{profile.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-slate-400" />
                <span className="text-sm text-slate-600">{profile.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={16} className="text-slate-400" />
                <span className="text-sm text-slate-600">{profile.location || profile.address}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar size={16} className="text-slate-400" />
                <span className="text-sm text-slate-600">Member since {formatDate(profile.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <User size={20} className="text-orange-600" />
                  {editing ? 'Edit Profile' : 'Profile Information'}
                </h2>
                {!editing && (
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                  >
                    <Edit size={16} />
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            <div className="p-6">
              {editing ? (
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Personal Information</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                          placeholder="Enter your email"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                          placeholder="Enter your phone number"
                        />
                      </div>
                      <div>
                        <LocationPicker
                          label="Location"
                          required={false}
                          value={geo}
                          onChange={setGeo}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password Change */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Lock size={20} className="text-orange-600" />
                      Change Password
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">Leave blank if you don't want to change password</p>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="relative">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={editForm.currentPassword}
                          onChange={(e) => setEditForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <div className="relative">
                        <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={editForm.newPassword}
                          onChange={(e) => setEditForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <div className="relative">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={editForm.confirmPassword}
                          onChange={(e) => setEditForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-4 border-t">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Read-only Profile View */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Personal Information</h3>
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Full Name</p>
                          <p className="font-medium text-slate-900">{profile.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Email Address</p>
                          <p className="font-medium text-slate-900">{profile.email}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Phone Number</p>
                          <p className="font-medium text-slate-900">{profile.phone}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Location</p>
                          <p className="font-medium text-slate-900">{profile.location || profile.address}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Account Information</h3>
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Role</p>
                          <p className="font-medium text-slate-900">{roleLabel(profile.role)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Account Status</p>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              profile.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {profile.isActive ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Presence</p>
                          <span className="inline-flex items-center gap-2 px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                !profile.isActive
                                  ? 'bg-red-500'
                                  : connected
                                    ? 'bg-green-500'
                                    : 'bg-slate-400'
                              }`}
                            />
                            {!profile.isActive
                              ? 'Non-active'
                              : connected
                                ? 'Online'
                                : 'Offline'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Member Since</p>
                          <p className="font-medium text-slate-900">{formatDate(profile.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Last Login</p>
                          <p className="font-medium text-slate-900">{formatDate(profile.lastLogin)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
