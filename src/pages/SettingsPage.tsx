import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  User,
  ShieldCheck,
  Save,
  CheckCircle2,
  Mail,
  Sliders,
  AlertCircle,
  RefreshCw,
  Users,
  ShieldAlert,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { FormField, Input, Select } from '../components/common/FormField';
import { Modal } from '../components/common/Modal';
import { AuthUser } from '../types';
import { api } from '../services/api';

interface SettingsPageProps {
  currentUser?: AuthUser | null;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser }) => {
  const isAdmin = currentUser?.role === 'ADMIN';

  const [reminderDays, setReminderDays] = useState('7');
  const [inAppNotifs, setInAppNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smtpConfigured, setSmtpConfigured] = useState(true);
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com:465');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailNotice, setTestEmailNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSendTestEmail = async () => {
    setIsSendingTestEmail(true);
    setTestEmailNotice(null);
    try {
      const res = await api.sendTestEmail(currentUser?.email || 'asokanmounesh@gmail.com');
      setTestEmailNotice({
        message: res.message || 'Diagnostic email delivered! Check your inbox.',
        type: 'success',
      });
      setTimeout(() => setTestEmailNotice(null), 8000);
    } catch (err: any) {
      setTestEmailNotice({
        message: err.message || 'Failed to dispatch test email. Please check network.',
        type: 'error',
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Staff management state (Admin only)
  const [staffList, setStaffList] = useState<AuthUser[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [roleActionId, setRoleActionId] = useState<string | null>(null);
  const [roleNotice, setRoleNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Register New Staff State
  const [isRegisterStaffOpen, setIsRegisterStaffOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'TECHNICIAN' | 'ADMIN'>('TECHNICIAN');
  const [isRegisteringStaff, setIsRegisteringStaff] = useState(false);
  const [registerStaffError, setRegisterStaffError] = useState<string | null>(null);

  const handleRegisterStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim() || newStaffPassword.length < 8) {
      setRegisterStaffError('Please provide a valid name, email, and at least 8-character password.');
      return;
    }
    setIsRegisteringStaff(true);
    setRegisterStaffError(null);
    try {
      const res = await api.createStaffUser({
        name: newStaffName.trim(),
        email: newStaffEmail.trim(),
        password: newStaffPassword,
        role: newStaffRole,
      });

      setIsRegisterStaffOpen(false);
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPassword('');
      setNewStaffRole('TECHNICIAN');

      setRoleNotice({
        message: res.message || `Staff member ${newStaffEmail.trim()} successfully registered! Welcome email with login details dispatched via Gmail SMTP.`,
        type: 'success',
      });

      // Instantly refresh and show the updated staff list
      await loadStaff();
      setTimeout(() => setRoleNotice(null), 5000);
    } catch (err: any) {
      setRegisterStaffError(err.message || 'Failed to register staff account.');
    } finally {
      setIsRegisteringStaff(false);
    }
  };

  const handleDeleteStaff = async (staff: AuthUser) => {
    if (!window.confirm(`Are you sure you want to remove staff member ${staff.name} (${staff.email})?`)) {
      return;
    }
    setRoleActionId(staff.id);
    try {
      await api.deleteUser(staff.id);
      setStaffList((prev) => prev.filter((s) => s.id !== staff.id && s.email !== staff.email));
      setRoleNotice({
        message: `Staff member ${staff.name} removed from registry.`,
        type: 'success',
      });
      setTimeout(() => setRoleNotice(null), 4000);
    } catch (err: any) {
      setRoleNotice({
        message: err.message || 'Failed to remove staff account.',
        type: 'error',
      });
    } finally {
      setRoleActionId(null);
    }
  };

  // Load backend reminder settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await api.fetchReminderSettings();
        if (data) {
          setReminderDays(String(data.reminder_days_before || 7));
          setEmailNotifs(Boolean(data.email_enabled));
          setInAppNotifs(Boolean(data.in_app_enabled));
          setSmtpConfigured(Boolean(data.smtp_configured));
          if ((data as any).smtp_host) {
            setSmtpHost(`${(data as any).smtp_host}:${(data as any).smtp_port || 465}`);
          }
        }
      } catch {
        // Fallback to local default if API not reached
      }
    };
    loadSettings();
  }, []);

  const loadStaff = async () => {
    if (!isAdmin) return;
    setIsLoadingStaff(true);
    try {
      const users = await api.listUsers();
      setStaffList(users);
    } catch {
      // Fallback
    } finally {
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadStaff();
    }
  }, [isAdmin]);

  const handleToggleRole = async (targetUser: AuthUser) => {
    const newRole = targetUser.role === 'ADMIN' ? 'TECHNICIAN' : 'ADMIN';
    setRoleActionId(targetUser.id);
    setRoleNotice(null);
    try {
      const updated = await api.updateUserRole(targetUser.id, newRole);
      setStaffList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: updated.role } : u))
      );
      setRoleNotice({
        message: `Successfully updated role for ${targetUser.name} to ${newRole}.`,
        type: 'success',
      });
      setTimeout(() => setRoleNotice(null), 4000);
    } catch (err: any) {
      setRoleNotice({
        message: err.message || `Failed to update role for ${targetUser.name}.`,
        type: 'error',
      });
    } finally {
      setRoleActionId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setSaveError('Administrator privileges required to modify calibration thresholds.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await api.updateReminderSettings({
        reminder_days_before: parseInt(reminderDays, 10),
        email_enabled: emailNotifs,
        in_app_enabled: inAppNotifs,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update system settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure calibration thresholds, alert preferences, and administrative profile.
          </p>
        </div>
        {isAdmin ? (
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            icon={<Save className="w-4 h-4" />}
          >
            Save All Changes
          </Button>
        ) : (
          <div className="text-xs px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg border border-slate-200 font-medium">
            Staff View-Only
          </div>
        )}
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>System configuration and notification preferences saved successfully.</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {!isAdmin && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            You are logged in as <strong>{currentUser?.role || 'TECHNICIAN'}</strong>.
            Calibration notice windows and reminder settings can only be altered by an Administrator.
          </span>
        </div>
      )}

      {/* Section 1: Reminder Settings */}
      <Card>
        <CardHeader
          title="Reminder & Compliance Thresholds"
          subtitle="Configure proactive calibration warnings before due dates"
          action={<Clock className="w-4 h-4 text-slate-400" />}
        />
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Proactive Warning Threshold"
              helperText="How far in advance to trigger calibration due warnings"
            >
              <Select
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value)}
                disabled={!isAdmin}
              >
                <option value="7">7 Days in Advance (Standard)</option>
                <option value="14">14 Days in Advance</option>
                <option value="30">30 Days in Advance (Monthly)</option>
                <option value="60">60 Days in Advance</option>
              </Select>
            </FormField>

            <FormField
              label="SMTP Delivery Status"
              helperText="Status of background email dispatch service"
            >
              <div className="space-y-2.5">
                <div className="h-10 px-3 flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-600">Email Gateway:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                      smtpConfigured
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {smtpConfigured ? `Active (${smtpHost})` : 'Connecting...'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendTestEmail}
                    disabled={isSendingTestEmail}
                    isLoading={isSendingTestEmail}
                    icon={<Mail className="w-3.5 h-3.5 text-blue-600" />}
                    className="text-xs h-8"
                  >
                    Send Diagnostic Test Email to Me
                  </Button>
                  <span className="text-[11px] text-slate-500 truncate">
                    Delivers to {currentUser?.email || 'asokanmounesh@gmail.com'}
                  </span>
                </div>

                {testEmailNotice && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      testEmailNotice.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {testEmailNotice.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{testEmailNotice.message}</span>
                  </div>
                )}
              </div>
            </FormField>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Notification Channels
            </h4>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={inAppNotifs}
                onChange={(e) => setInAppNotifs(e.target.checked)}
                disabled={!isAdmin}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
              />
              <div>
                <p className="text-xs font-semibold text-slate-800">In-App Notifications</p>
                <p className="text-[11px] text-slate-500">
                  Generate alerts in the Notification Center for due soon and overdue equipment.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailNotifs}
                onChange={(e) => setEmailNotifs(e.target.checked)}
                disabled={!isAdmin}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
              />
              <div>
                <p className="text-xs font-semibold text-slate-800">Email Reminders</p>
                <p className="text-[11px] text-slate-500">
                  Send automated MIME email summaries to equipment custodians via background scheduler.
                </p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: User Profile */}
      <Card>
        <CardHeader
          title="Staff Profile & Credentials"
          subtitle="Laboratory authentication and role assignment"
          action={<User className="w-4 h-4 text-slate-400" />}
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Full Staff Name">
              <Input
                value={currentUser?.name || 'Staff User'}
                disabled
              />
            </FormField>
            <FormField label="Staff Email Address">
              <Input
                value={currentUser?.email || 'staff@laboratory.com'}
                disabled
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Assigned Role">
              <div className="h-10 px-3 flex items-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800">
                {currentUser?.role || 'TECHNICIAN'}
              </div>
            </FormField>
            <FormField label="Security Compliance">
              <div className="h-10 px-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>PBKDF2 Salted Auth · JWT Token Bearer</span>
              </div>
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Laboratory Staff & Role Management (RBAC) */}
      <Card>
        <CardHeader
          title="Laboratory Staff & Role Management (RBAC)"
          subtitle={
            isAdmin
              ? "Review staff accounts and promote technicians to administrators"
              : "Access control policies and laboratory role assignments"
          }
          action={<Users className="w-4 h-4 text-slate-400" />}
        />
        <CardContent className="space-y-4">
          {roleNotice && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2.5 text-xs ${
                roleNotice.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {roleNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{roleNotice.message}</span>
            </div>
          )}

          {isAdmin ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
                <span>Registered Staff Members ({staffList.length})</span>
                <div className="flex items-center gap-2.5">
                  <Button
                    type="button"
                    variant="primary"
                    size="xs"
                    onClick={() => {
                      setRegisterStaffError(null);
                      setIsRegisterStaffOpen(true);
                    }}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    + Register Staff
                  </Button>
                  <button
                    type="button"
                    onClick={loadStaff}
                    disabled={isLoadingStaff}
                    className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStaff ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {isLoadingStaff ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading staff registry...</div>
              ) : staffList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">No staff members found.</div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                  {staffList.map((staff, idx) => {
                    const isSelf = staff.id === currentUser?.id;
                    const isTargetAdmin = staff.role === 'ADMIN';

                    return (
                      <div
                        key={staff.id ? `${staff.id}-${idx}` : `staff-${idx}`}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-900 truncate">
                              {staff.name}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                                (You)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{staff.email}</p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase ${
                              isTargetAdmin
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {staff.role}
                          </span>

                          <Button
                            variant="outline"
                            size="sm"
                            disabled={roleActionId === staff.id}
                            isLoading={roleActionId === staff.id}
                            onClick={() => handleToggleRole(staff)}
                            className="text-xs h-7"
                          >
                            {isTargetAdmin ? 'Demote to Technician' : 'Promote to Admin'}
                          </Button>

                          {!isSelf && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={roleActionId === staff.id}
                              onClick={() => handleDeleteStaff(staff)}
                              className="text-xs h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2"
                              title="Remove staff member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <ShieldAlert className="w-4 h-4 text-slate-500" />
                <span>Role-Based Access Control Active</span>
              </div>
              <p>
                Staff accounts registered publicly default strictly to the <strong>TECHNICIAN</strong> role.
                Promotion to <strong>ADMIN</strong> requires explicit elevation by an existing administrator.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Register Staff Modal */}
      {isRegisterStaffOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsRegisterStaffOpen(false)}
          title="Register Laboratory Staff Member"
        >
          <form onSubmit={handleRegisterStaffSubmit} className="space-y-4 text-xs">
            {registerStaffError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{registerStaffError}</span>
              </div>
            )}

            <p className="text-slate-600 text-xs">
              Directly registers the staff member, activates their laboratory credentials, and dispatches an automated Welcome Notice via Gmail SMTP. They will receive automated ISO 17025 calibration reminder alerts.
            </p>

            <FormField label="Full Staff Name" required>
              <Input
                type="text"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="Dr. Alan Croft"
                required
              />
            </FormField>

            <FormField label="Staff Email Address" required>
              <Input
                type="email"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
                placeholder="alan.croft@laboratory.com"
                required
              />
            </FormField>

            <FormField label="Assigned Laboratory Role" required>
              <Select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value as any)}
              >
                <option value="TECHNICIAN">Technician (Lab Staff & Metrologist)</option>
                <option value="ADMIN">Administrator (Full Compliance Privileges)</option>
              </Select>
            </FormField>

            <FormField label="Temporary Password (min 8 chars)" required>
              <Input
                type="password"
                value={newStaffPassword}
                onChange={(e) => setNewStaffPassword(e.target.value)}
                placeholder="Min 8 characters"
                minLength={8}
                required
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRegisterStaffOpen(false)}
                disabled={isRegisteringStaff}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isRegisteringStaff}
                icon={isRegisteringStaff ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : undefined}
              >
                {isRegisteringStaff ? 'Registering Staff...' : 'Register Staff Account'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
