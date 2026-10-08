import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Settings as SettingsIcon,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { NotificationItem } from '../types';

interface NotificationsPageProps {
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onNavigate: (path: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  onMarkAllAsRead,
  onMarkAsRead,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Unread' | 'Calibration Alerts' | 'System'>('All');

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'Unread') return !item.read;
    if (activeTab === 'Calibration Alerts') return item.category === 'alert' || item.category === 'reminder';
    if (activeTab === 'System') return item.category === 'system';
    return true;
  });

  const getNotificationIcon = (category: NotificationItem['category']) => {
    switch (category) {
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'reminder':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'system':
      default:
        return <SettingsIcon className="w-4 h-4 text-blue-600" />;
    }
  };

  const getIconBg = (category: NotificationItem['category']) => {
    switch (category) {
      case 'alert':
        return 'bg-rose-50 border-rose-200';
      case 'reminder':
        return 'bg-amber-50 border-amber-200';
      case 'success':
        return 'bg-emerald-50 border-emerald-200';
      case 'system':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Notifications
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            System alerts, compliance dispatches, and calibration reminders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              icon={<CheckCheck className="w-4 h-4 text-blue-600" />}
              onClick={onMarkAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {(['All', 'Unread', 'Calibration Alerts', 'System'] as const).map((tab) => {
          const isActive = activeTab === tab;
          let count = 0;
          if (tab === 'All') count = notifications.length;
          else if (tab === 'Unread') count = notifications.filter((n) => !n.read).length;
          else if (tab === 'Calibration Alerts') count = notifications.filter((n) => n.category === 'alert' || n.category === 'reminder').length;
          else if (tab === 'System') count = notifications.filter((n) => n.category === 'system').length;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                isActive
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span>{tab}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">No notifications in this view</p>
            <p className="text-xs text-slate-400 mt-1">All calibrations and system updates are synchronized.</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                if (!notif.read) onMarkAsRead(notif.id);
                if (notif.equipmentId) onNavigate(`/equipment/${notif.equipmentId}`);
              }}
              className={`p-4 sm:p-5 flex items-start gap-4 transition-colors cursor-pointer ${
                !notif.read ? 'bg-blue-50/25 hover:bg-blue-50/50' : 'hover:bg-slate-50/80'
              }`}
            >
              {/* Category Icon */}
              <div
                className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${getIconBg(
                  notif.category
                )}`}
              >
                {getNotificationIcon(notif.category)}
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">
                      {notif.title}
                    </h4>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{notif.timestamp}</span>
                </div>

                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {notif.description}
                </p>

                {notif.equipmentId && (
                  <div className="mt-2.5 flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!notif.read) onMarkAsRead(notif.id);
                        onNavigate(`/equipment/${notif.equipmentId}`);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Equipment Specs</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
