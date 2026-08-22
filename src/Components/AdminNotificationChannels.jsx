import { useEffect, useState } from 'react';
import { Bell, Loader, Volume2, VolumeX } from 'lucide-react';
import { apiRequest } from '../lib/api';
import {
  fetchDevicePushPreference,
  registerWebPushAdmin,
  saveDevicePushPreference,
  unregisterWebPushAdmin,
  isPushSupported,
} from '../utils/pushNotifications.js';

const SOUND_STORAGE_KEY = 'fixitnow_admin_notification_sound';

function Toggle({ checked, onChange, disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-blue-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export default function AdminNotificationChannels({ mode }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [settingsResult, devicePush] = await Promise.all([
          apiRequest('/notifications/settings', { method: 'GET' }),
          fetchDevicePushPreference().catch(() => true),
        ]);

        if (!mounted) return;
        setPushEnabled(settingsResult?.data?.pushEnabled ?? devicePush ?? true);
        setInAppEnabled(settingsResult?.data?.inAppEnabled ?? true);
        try {
          setSoundEnabled(localStorage.getItem(SOUND_STORAGE_KEY) !== 'false');
        } catch {
          setSoundEnabled(true);
        }
      } catch (err) {
        if (mounted) setError(err?.message || 'Failed to load notification settings');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const saveSettings = async (next) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await apiRequest('/notifications/settings', {
        method: 'PUT',
        body: JSON.stringify({
          pushEnabled: next.pushEnabled ?? pushEnabled,
          inAppEnabled: next.inAppEnabled ?? inAppEnabled,
        }),
      });
      if (!result?.success) throw new Error(result?.message || 'Failed to save notification settings');
      if (next.pushEnabled !== undefined) setPushEnabled(next.pushEnabled);
      if (next.inAppEnabled !== undefined) setInAppEnabled(next.inAppEnabled);
      setSuccess('Notification settings saved.');
    } catch (err) {
      setError(err?.message || 'Failed to save notification settings');
    } finally {
      setBusy(false);
    }
  };

  const togglePush = async (next) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (next) {
        const reg = await registerWebPushAdmin();
        if (!reg.ok) {
          throw new Error(
            reg.reason === 'denied'
              ? 'Notifications are blocked in browser settings.'
              : reg.reason === 'disabled'
                ? 'Push notifications are not configured on the server yet.'
                : 'Could not enable push notifications.',
          );
        }
      } else {
        await unregisterWebPushAdmin();
      }
      await saveDevicePushPreference(next);
      await saveSettings({ pushEnabled: next });
    } catch (err) {
      setError(err?.message || 'Failed to update push notifications');
      setBusy(false);
    }
  };

  const toggleSound = (next) => {
    setSoundEnabled(next);
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, String(next));
      window.dispatchEvent(new CustomEvent('admin-notification-sound-changed', {
        detail: { enabled: next },
      }));
    } catch {
      // Ignore localStorage failures.
    }
    setSuccess(next ? 'Notification sound enabled.' : 'Notification sound muted.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader size={24} className="animate-spin text-blue-500" />
      </div>
    );
  }

  const isPushMode = mode === 'push';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {isPushMode ? <Bell className="text-blue-500" size={24} /> : soundEnabled ? <Volume2 className="text-blue-500" size={24} /> : <VolumeX className="text-slate-400" size={24} />}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {isPushMode ? 'Push Notifications' : 'In-App Notifications'}
          </h2>
          <p className="text-sm text-slate-600">
            {isPushMode
              ? 'Control browser push notifications for this admin device.'
              : 'Control the in-app notification feed and its live sound.'}
          </p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 border border-green-200">{success}</div>}

      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        {isPushMode ? (
          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <p className="font-medium text-slate-900">Push Notifications</p>
              <p className="text-sm text-slate-600">Receive notifications from FixItNow even when the panel is not focused.</p>
            </div>
            <Toggle
              checked={pushEnabled}
              onChange={togglePush}
              disabled={busy || !isPushSupported()}
              label="Push Notifications"
            />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100">
              <div>
                <p className="font-medium text-slate-900">In-App Notifications</p>
                <p className="text-sm text-slate-600">Show notifications in the admin notification bell and live feed.</p>
              </div>
              <Toggle
                checked={inAppEnabled}
                onChange={(next) => saveSettings({ inAppEnabled: next })}
                disabled={busy}
                label="In-App Notifications"
              />
            </div>
            <div className="flex items-center justify-between gap-4 py-2">
              <div className="flex items-center gap-3">
                {soundEnabled ? <Volume2 size={20} className="text-blue-500" /> : <VolumeX size={20} className="text-slate-400" />}
                <div>
                  <p className="font-medium text-slate-900">Notification Sound</p>
                  <p className="text-sm text-slate-600">Only controls the sound played for new live in-app notifications.</p>
                </div>
              </div>
              <Toggle
                checked={soundEnabled}
                onChange={toggleSound}
                disabled={busy}
                label="Notification Sound"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
