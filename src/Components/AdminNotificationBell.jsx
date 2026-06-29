/**
 * FILE: adminpanel/src/Components/AdminNotificationBell.jsx
 * 
 * Admin notification bell with dropdown
 * Shows all admin notifications (new bookings, workers, customers, etc.)
 */

import { useState, useEffect } from 'react';
import { Bell, Settings, Trash2 } from 'lucide-react';
import { apiRequestWithAuth } from '../lib/apiRequest';

export default function AdminNotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch notifications
  useEffect(() => {
    fetchNotifications();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const result = await apiRequestWithAuth('/notifications', {
        method: 'GET',
      });

      if (result?.success && result?.data) {
        setNotifications(result.data);
        const unread = result.data.filter(n => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await apiRequestWithAuth(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
      
      setNotifications(prev =>
        prev.map(n =>
          n._id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await apiRequestWithAuth(`/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'new_booking': '📅',
      'new_worker': '👷',
      'new_customer': '👤',
      'claim_pending': '⏳',
      'new_review': '⭐',
      'new_advertisement': '📢',
      'claim_approved': '✅',
      'claim_rejected': '❌',
      'booking_received': '✓',
      'worker_assigned': '👷',
      'job_completed': '✓✓',
    };
    return icons[type] || '🔔';
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-slate-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div>
              <h3 className="font-semibold text-slate-900">Notifications</h3>
              <p className="text-sm text-slate-500">
                {unreadCount} unread
              </p>
            </div>
            <a
              href="/admin/settings"
              className="p-1 hover:bg-slate-100 rounded transition-colors"
              title="Notification Settings"
            >
              <Settings size={18} className="text-slate-500" />
            </a>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification._id}
                  className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => markAsRead(notification._id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <p className="font-medium text-slate-900 truncate">
                          {notification.title}
                        </p>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        {new Date(notification.createdAt).toLocaleDateString('en-PK', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification._id);
                      }}
                      className="p-1 hover:bg-red-100 text-red-500 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-200 text-center">
              <a
                href="/admin/notifications"
                className="text-sm font-medium text-blue-500 hover:text-blue-600"
              >
                View All Notifications →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
