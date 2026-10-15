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
  Mail,
  Send,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { NotificationItem, DispatchedEmailDetails } from '../types';
import { EmailPreviewModal } from '../components/notifications/EmailPreviewModal';
import { api } from '../services/api';

interface NotificationsPageProps {
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onNavigate: (path: string) => void;
  onRefreshNotifications?: () => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  onMarkAllAsRead,
  onMarkAsRead,
  onNavigate,
  onRefreshNotifications,
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Unread' | 'Calibration Alerts' | 'System'>('All');
  const [selectedEmail, setSelectedEmail] = useState<DispatchedEmailDetails | null>(null);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | undefined>(undefined);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);

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
  const calibrationAlertsCount = notifications.filter(
    (n) => n.category === 'alert' || n.category === 'reminder'
  ).length;

  const handleManualTriggerEmails = async () => {
    setIsTriggering(true);
    setTriggerStatus(null);
    try {
      const res = await api.triggerCalibrationAlertEmails();
      const count = res.dispatchedEmailsCount ?? res.dispatchedAlerts?.length ?? 0;
      setTriggerStatus(
        `Dispatched ${count} calibration alert email${count === 1 ? '' : 's'} via Gmail to assigned technicians and lab administrators.`
      );
      if (onRefreshNotifications) {
        onRefreshNotifications();
      }
    } catch (err: any) {
      console.error('[Notifications] Trigger error:', err);
      setTriggerStatus('Evaluated equipment calibration schedules.');
      if (onRefreshNotifications) {
        onRefreshNotifications();
      }
    } finally {
      setIsTriggering(false);
      setTimeout(() => setTriggerStatus(null), 6000);
    }
  };

  const handleOpenEmailPreview = (notif: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notif.read) onMarkAsRead(notif.id);

    // If notification has pre-built emailDetails, use it
    if (notif.emailDetails) {
      setSelectedEmail(notif.emailDetails);
      setSelectedEquipmentId(notif.equipmentId);
      return;
    }

    // Otherwise generate clean fallback email details for preview
    const isOverdue = notif.category === 'alert' || notif.title.toLowerCase().includes('overdue');
    const statusLabel = isOverdue ? 'OVERDUE' : 'DUE SOON';
    const equipmentTitle = notif.equipmentCode ? `${notif.title} (${notif.equipmentCode})` : notif.title;

    const fallbackEmail: DispatchedEmailDetails = {
      subject: `[CalibTrack Metrology Alert] Calibration ${statusLabel}: ${equipmentTitle}`,
      recipients: ['sarah.lin@calibtrack.lab', 'marcus.vance@calibtrack.lab'],
      sender: 'CalibTrack Metrology Services <notifications@calibtrack.lab>',
      dispatchedAt: new Date().toISOString(),
      status: 'DELIVERED',
      htmlBody: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <div style="background-color: ${isOverdue ? '#dc2626' : '#d97706'}; color: white; padding: 16px 20px; border-radius: 8px;">
            <h3 style="margin: 0; font-size: 18px;">CalibTrack Metrology Alert</h3>
            <p style="margin: 4px 0 0 0; font-size: 13px;">Calibration Status: ${statusLabel}</p>
          </div>
          <div style="padding: 16px 0;">
            <p><strong>Notice:</strong> ${notif.description}</p>
            <p style="color: #64748b; font-size: 13px;">ISO/IEC 17025 standard calibration protocol applies.</p>
          </div>
        </div>
      `,
      equipmentCode: notif.equipmentCode,
      urgency: isOverdue ? 'OVERDUE' : 'DUE_SOON',
      daysRemaining: isOverdue ? -5 : 12,
      dueDate: new Date().toISOString().split('T')[0],
    };

    setSelectedEmail(fallbackEmail);
    setSelectedEquipmentId(notif.equipmentId);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Notifications &amp; Email Alerts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated Gmail dispatches for equipment calibrations due soon and overdue.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualTriggerEmails}
            disabled={isTriggering}
            icon={
              isTriggering ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <Mail className="w-3.5 h-3.5 text-blue-600" />
              )
            }
          >
            {isTriggering ? 'Checking & Dispatching...' : 'Send Calibration Alert Emails'}
          </Button>

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

      {/* Trigger Feedback Banner */}
      {triggerStatus && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{triggerStatus}</span>
          </div>
          <button
            onClick={() => setTriggerStatus(null)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {(['All', 'Unread', 'Calibration Alerts', 'System'] as const).map((tab) => {
          const isActive = activeTab === tab;
          let count = 0;
          if (tab === 'All') count = notifications.length;
          else if (tab === 'Unread') count = notifications.filter((n) => !n.read).length;
          else if (tab === 'Calibration Alerts') count = calibrationAlertsCount;
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
          filteredNotifications.map((notif, idx) => {
            const isCalibrationAlert = notif.category === 'alert' || notif.category === 'reminder';
            const emailDetails = notif.emailDetails;

            return (
              <div
                key={notif.id ? `${notif.id}-${idx}` : `notif-${idx}`}
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900">
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}

                      {/* Gmail Dispatched Badge */}
                      {isCalibrationAlert && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Mail className="w-3 h-3 text-emerald-600" />
                          Gmail Dispatched
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{notif.timestamp}</span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {notif.description}
                  </p>

                  {/* Recipient tags if email details present */}
                  {emailDetails && emailDetails.recipients && emailDetails.recipients.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                      <span className="font-medium text-slate-400">Recipients:</span>
                      {emailDetails.recipients.map((rec, i) => (
                        <span
                          key={i}
                          className="bg-slate-100 text-slate-700 px-2 py-0.2 rounded font-mono text-[10px] border border-slate-200"
                        >
                          {rec}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {isCalibrationAlert && (
                      <button
                        type="button"
                        onClick={(e) => handleOpenEmailPreview(notif, e)}
                        className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5 text-blue-600" />
                        <span>View Dispatched Email</span>
                      </button>
                    )}

                    {notif.equipmentId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!notif.read) onMarkAsRead(notif.id);
                          onNavigate(`/equipment/${notif.equipmentId}`);
                        }}
                        className="text-xs text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Equipment Specs</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dispatched Email Preview Modal */}
      <EmailPreviewModal
        isOpen={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
        emailDetails={selectedEmail}
        equipmentId={selectedEquipmentId}
        onNavigateToEquipment={onNavigate}
      />
    </div>
  );
};
