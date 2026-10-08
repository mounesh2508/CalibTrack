import React, { useState } from 'react';
import {
  Bell,
  Clock,
  User,
  ShieldCheck,
  Save,
  CheckCircle2,
  Mail,
  Sliders,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { FormField, Input, Select } from '../components/common/FormField';

export const SettingsPage: React.FC = () => {
  const [profile, setProfile] = useState({
    name: 'Admin User',
    email: 'admin@calibtrack-lab.com',
    role: 'Quality Assurance & Metrology Administrator',
    organization: 'Central Analytical & Biometrology Laboratories',
  });

  const [reminderDays, setReminderDays] = useState('30');
  const [autoReminders, setAutoReminders] = useState(true);
  const [inAppNotifs, setInAppNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [overdueEscalation, setOverdueEscalation] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2500);
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
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          icon={<Save className="w-4 h-4" />}
        >
          Save All Changes
        </Button>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>System configuration and notification preferences saved successfully.</span>
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
              >
                <option value="60">60 Days in advance (Comprehensive)</option>
                <option value="30">30 Days in advance (Recommended standard)</option>
                <option value="14">14 Days in advance (Short lead-time)</option>
                <option value="7">7 Days in advance (Urgent)</option>
              </Select>
            </FormField>

            <div className="flex flex-col justify-center pt-2">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    Automatic Calibration Reminders
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Schedule automated alerts based on equipment interval
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoReminders}
                  onChange={(e) => setAutoReminders(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Notification Preferences */}
      <Card>
        <CardHeader
          title="Notification Preferences"
          subtitle="Choose dispatch channels for calibration events"
          action={<Bell className="w-4 h-4 text-slate-400" />}
        />
        <CardContent className="space-y-4">
          <div className="divide-y divide-slate-100">
            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  In-App Notification Center
                </p>
                <p className="text-[11px] text-slate-500">
                  Display badges and banner alerts in the top bar and notification hub
                </p>
              </div>
              <input
                type="checkbox"
                checked={inAppNotifs}
                onChange={(e) => setInAppNotifs(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Email Notifications to Custodians
                </p>
                <p className="text-[11px] text-slate-500">
                  Send certificate expiration warnings to assigned technicians
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailNotifs}
                onChange={(e) => setEmailNotifs(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Critical Overdue Escalation
                </p>
                <p className="text-[11px] text-slate-500">
                  Immediately flag quality control managers when equipment passes due date
                </p>
              </div>
              <input
                type="checkbox"
                checked={overdueEscalation}
                onChange={(e) => setOverdueEscalation(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Profile */}
      <Card>
        <CardHeader
          title="Administrative Profile"
          subtitle="User identification and laboratory authorization credentials"
          action={<User className="w-4 h-4 text-slate-400" />}
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Full Name">
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </FormField>

            <FormField label="Email Address">
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </FormField>

            <FormField label="Role / Authorization Level">
              <Input
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
              />
            </FormField>

            <FormField label="Organization / Laboratory Site">
              <Input
                value={profile.organization}
                onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
