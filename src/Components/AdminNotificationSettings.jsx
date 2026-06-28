/**
 * FILE: adminpanel/src/Components/AdminNotificationSettings.jsx
 * 
 * Admin notification preferences UI
 * Control push and in-app notifications
 */

import { useState, useEffect } from 'react';
import { Bell, Save, Loader } from 'lucide-react';
import { apiRequestWithAuth } from '../lib/apiRequest';

export default function AdminNotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [settings, setSettings] = useState({
    pushEnabled: true,
    inAppEnabled: true,
    notificationTypes: {
      newBooking: true,
      newWorker: true,
      newCustomer: true,
      claimPending: true,
      newReview: true,
      newAdvertisement: true,
    },
  });

  const adminNotificationLabels = {
    newBooking: '📅 New Booking Requests',
    newWorker: '👷 New Worker Registrations',
    newCustomer: '👤 New Customer Signups',
    claimPending: '⏳ Worker Claim Reviews',
    newReview: '⭐ New Reviews',
    newAdvertisement: '📢 New Advertisements',
  };

  // Load settings
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await apiRequestWithAuth('/notifications/settings', {
        method: 'GET',
      });

      if (result?.success && result?.data) {
        setSettings({
          pushEnabled: result.data.pushEnabled ?? true,
          inAppEnabled: result.data.inAppEnabled ?? true,
          notificationTypes: {
            ...settings.notificationTypes,
            ...result.data.notificationTypes,
          },
        });
      }
    } catch (err) {
      console.error('Error fetching notification settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key, value) => {
    if (key === 'pushEnabled' || key === 'inAppEnabled') {
      setSettings(prev => ({
        ...prev,
        [key]: value,
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        notificationTypes: {
          ...prev.notificationTypes,
          [key]: value,
        },
      }));
    }
    setSuccess('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const result = await apiRequestWithAuth('/notifications/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });

      if (result?.success) {
        setSuccess('Notification settings saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result?.message || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving notification settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
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
        <Bell className="text-orange-500" size={24} />
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notification Settings</h2>
          <p className="text-sm text-slate-600">Control your notification preferences</p>
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

      {/* Notification Channels */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900">Notification Channels</h3>

        {/* Push Notifications */}
        <div className="flex items-center justify-between py-3 border-b border-slate-100">
          <div>
            <p className="font-medium text-slate-900">Push Notifications</p>
            <p className="text-sm text-slate-600">Receive browser/app notifications</p>
          </div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.pushEnabled}
              onChange={(e) => handleToggle('pushEnabled', e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-orange-500"
            />
          </label>
        </div>

        {/* In-App Notifications */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium text-slate-900">In-App Notifications</p>
            <p className="text-sm text-slate-600">See notifications in the bell icon</p>
          </div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.inAppEnabled}
              onChange={(e) => handleToggle('inAppEnabled', e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-orange-500"
            />
          </label>
        </div>
      </div>

      {/* Notification Types */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900">Admin Notifications</h3>
        <p className="text-sm text-slate-600">Choose which notifications you want to receive</p>

        <div className="space-y-3">
          {Object.keys(adminNotificationLabels).map(notifType => (
            <div key={notifType} className="flex items-center justify-between py-2">
              <label className="flex items-center cursor-pointer gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={settings.notificationTypes[notifType] ?? true}
                  onChange={(e) => handleToggle(notifType, e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-orange-500"
                />
                <span className="text-slate-700">
                  {adminNotificationLabels[notifType]}
                </span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <>
              <Loader size={18} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={18} />
              Save Settings
            </>
          )}
        </button>
      </div>

      {/* Info */}
      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700 border border-blue-200">
        <p className="font-medium mb-1">💡 Tip:</p>
        <p>Disabling notifications won't prevent important updates from being saved. You can always check your notification history in the bell icon.</p>
      </div>
    </div>
  );
}
