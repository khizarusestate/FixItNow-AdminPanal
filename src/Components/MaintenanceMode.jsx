/**
 * FILE: adminpanel/src/Components/MaintenanceMode.jsx
 * 
 * Maintenance mode toggle for super admin
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, Power, Loader } from 'lucide-react';
import { apiRequestWithAuth } from '../lib/apiRequest';

export default function MaintenanceMode() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [message, setMessage] = useState('App is in maintenance. Please try again later.');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch current maintenance status
  useEffect(() => {
    fetchMaintenanceStatus();
  }, []);

  const fetchMaintenanceStatus = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await apiRequestWithAuth('/admin/maintenance-mode', {
        method: 'GET',
      });

      if (result?.success) {
        setMaintenanceEnabled(result.data.enabled || false);
        setMessage(result.data.message || 'App is in maintenance. Please try again later.');
      }
    } catch (err) {
      console.error('Error fetching maintenance status:', err);
      setError('Failed to load maintenance status');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const result = await apiRequestWithAuth('/admin/maintenance-mode', {
        method: 'PATCH',
        body: JSON.stringify({
          enabled: !maintenanceEnabled,
          message: message,
        }),
      });

      if (result?.success) {
        setMaintenanceEnabled(!maintenanceEnabled);
        setSuccess(result.message);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result?.message || 'Failed to update maintenance mode');
      }
    } catch (err) {
      console.error('Error updating maintenance mode:', err);
      setError('Failed to update maintenance mode');
    } finally {
      setSaving(false);
    }
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader size={24} className="animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AlertTriangle className="text-red-500" size={28} />
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Maintenance Mode</h2>
          <p className="text-sm text-slate-600">Super admin only - blocks user access</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 border border-green-200">
          {success}
        </div>
      )}

      {/* Main Toggle Card */}
      <div className="rounded-xl border-2 border-red-200 bg-red-50/50 p-6 space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900">Status</p>
            <p className="text-sm text-slate-600">
              {maintenanceEnabled ? 'Enabled - App is blocked' : 'Disabled - App is running'}
            </p>
          </div>
          <div
            className={`px-4 py-2 rounded-full font-medium text-sm ${
              maintenanceEnabled
                ? 'bg-red-500 text-white'
                : 'bg-green-500 text-white'
            }`}
          >
            {maintenanceEnabled ? 'ACTIVE' : 'INACTIVE'}
          </div>
        </div>

        {/* Custom Message */}
        <div className="space-y-2">
          <label className="block font-medium text-slate-900">
            Maintenance Message
          </label>
          <textarea
            value={message}
            onChange={handleMessageChange}
            placeholder="Enter message users will see..."
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            rows={3}
          />
          <p className="text-xs text-slate-500">
            This message will be shown to users when maintenance mode is enabled
          </p>
        </div>

        {/* Toggle Button */}
        <button
          onClick={handleToggle}
          disabled={saving}
          className={`w-full flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-medium text-white transition-colors ${
            maintenanceEnabled
              ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
              : 'bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400'
          }`}
        >
          {saving ? (
            <>
              <Loader size={18} className="animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Power size={18} />
              {maintenanceEnabled ? 'Disable Maintenance' : 'Enable Maintenance'}
            </>
          )}
        </button>
      </div>

      {/* Warning Box */}
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-2">
        <p className="font-semibold text-yellow-900 flex items-center gap-2">
          <AlertTriangle size={18} />
          Important
        </p>
        <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
          <li>When enabled, all users except super admin will be blocked</li>
          <li>API access will return 503 Service Unavailable</li>
          <li>Users will see your custom maintenance message</li>
          <li>Super admin access remains unrestricted</li>
          <li>Use during app updates or critical maintenance only</li>
        </ul>
      </div>

      {/* Info Box */}
      {maintenanceEnabled && (
        <div className="rounded-lg border border-red-300 bg-red-100 p-4 space-y-2">
          <p className="font-semibold text-red-900">⚠️ Maintenance Active</p>
          <p className="text-sm text-red-800">
            Users are currently blocked from accessing the app. Remember to disable maintenance mode when finished!
          </p>
        </div>
      )}
    </div>
  );
}
