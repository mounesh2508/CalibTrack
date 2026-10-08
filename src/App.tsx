import React, { useState, useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EquipmentListPage } from './pages/EquipmentListPage';
import { AddEquipmentPage } from './pages/AddEquipmentPage';
import { EquipmentDetailsPage } from './pages/EquipmentDetailsPage';
import { CalibrationPage } from './pages/CalibrationPage';
import { CalendarPage } from './pages/CalendarPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { Modal } from './components/common/Modal';
import { FormField, Input, Select, Textarea } from './components/common/FormField';
import { Button } from './components/common/Button';

import {
  initialEquipmentList,
  initialCalibrationRecords,
  initialNotifications,
  initialRecentActivities,
  initialCalendarEvents,
} from './data/mockData';
import { Equipment, CalibrationRecord, NotificationItem, RecentActivity } from './types';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const p = window.location.pathname;
    if (p === '/' || !p) return '/dashboard';
    return p;
  });

  const [equipmentList, setEquipmentList] = useState<Equipment[]>(initialEquipmentList);
  const [calibrationRecords, setCalibrationRecords] = useState<CalibrationRecord[]>(initialCalibrationRecords);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(initialRecentActivities);
  const [calendarEvents, setCalendarEvents] = useState(initialCalendarEvents);

  // Quick Calibrate Modal state
  const [calibrateTarget, setCalibrateTarget] = useState<Equipment | null>(null);
  const [calibrateForm, setCalibrateForm] = useState({
    date: new Date().toISOString().split('T')[0],
    provider: 'Metrology Global Solutions ISO 17025',
    certNumber: '',
    result: 'Passed' as CalibrationRecord['result'],
    remarks: 'Full verification conforming to laboratory ISO 17025 standards.',
  });

  // Handle URL history state & sync
  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      setCurrentPath(p === '/' ? '/dashboard' : p);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (path !== currentPath) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo(0, 0);
    }
  };

  const handleAddEquipment = (newEquip: Equipment) => {
    setEquipmentList((prev) => [newEquip, ...prev]);

    // Add recent activity
    const activity: RecentActivity = {
      id: `ACT-${Date.now()}`,
      type: 'equipment_added',
      title: 'Equipment added',
      description: `${newEquip.name} (${newEquip.code}) registered in ${newEquip.department}.`,
      timestamp: 'Just now',
      actor: 'Admin User',
      equipmentCode: newEquip.code,
    };
    setRecentActivities((prev) => [activity, ...prev]);

    // Add notification
    const notif: NotificationItem = {
      id: `NOTIF-${Date.now()}`,
      title: 'New Equipment Registered',
      description: `${newEquip.name} has been placed on the ${newEquip.calibrationIntervalMonths}-month calibration schedule.`,
      timestamp: 'Just now',
      category: 'system',
      read: false,
      equipmentId: newEquip.id,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const handleAddCalibrationRecord = (record: CalibrationRecord) => {
    setCalibrationRecords((prev) => [record, ...prev]);

    // Update corresponding equipment
    setEquipmentList((prev) =>
      prev.map((eq) => {
        if (eq.id === record.equipmentId || eq.code === record.equipmentCode) {
          const nextDate = new Date(record.nextDueDate);
          const today = new Date();
          const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return {
            ...eq,
            lastCalibrationDate: record.calibrationDate,
            nextCalibrationDate: record.nextDueDate,
            daysRemaining: diffDays,
            status: diffDays < 0 ? 'overdue' : diffDays <= 30 ? 'due_soon' : 'calibrated',
          };
        }
        return eq;
      })
    );

    // Add recent activity
    const activity: RecentActivity = {
      id: `ACT-${Date.now()}`,
      type: 'calibration_completed',
      title: 'Calibration completed',
      description: `${record.equipmentName} successfully calibrated by ${record.serviceProvider}.`,
      timestamp: 'Just now',
      actor: record.technicianName,
      equipmentCode: record.equipmentCode,
    };
    setRecentActivities((prev) => [activity, ...prev]);
  };

  const handleOpenCalibrateModal = (eq: Equipment) => {
    setCalibrateTarget(eq);
    setCalibrateForm({
      date: new Date().toISOString().split('T')[0],
      provider: 'Metrology Global Solutions ISO 17025',
      certNumber: `CERT-${eq.code}-${Math.floor(100 + Math.random() * 900)}`,
      result: 'Passed',
      remarks: `Instrument ${eq.name} recalibrated and tested within specifications.`,
    });
  };

  const handleQuickCalibrateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calibrateTarget) return;

    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + calibrateTarget.calibrationIntervalMonths);
    const nextDueDateStr = nextDate.toISOString().split('T')[0];

    const newRecord: CalibrationRecord = {
      id: `REC-${Date.now()}`,
      equipmentId: calibrateTarget.id,
      equipmentCode: calibrateTarget.code,
      equipmentName: calibrateTarget.name,
      calibrationDate: calibrateForm.date,
      nextDueDate: nextDueDateStr,
      serviceProvider: calibrateForm.provider,
      technicianName: 'Alan Croft, Senior Metrologist',
      certificateNumber: calibrateForm.certNumber || `CERT-${calibrateTarget.code}-99`,
      result: calibrateForm.result,
      standardUsed: calibrateTarget.calibrationStandard || 'NIST Traceable Reference',
      environmentalTemp: '21.0 °C',
      environmentalHumidity: '45 % RH',
      remarks: calibrateForm.remarks,
      status: 'Completed',
    };

    handleAddCalibrationRecord(newRecord);
    setCalibrateTarget(null);
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  // If path is /login, show the Login Page directly without the app shell
  if (currentPath === '/login') {
    return <LoginPage onLogin={() => navigate('/dashboard')} />;
  }

  // Parse path to match route
  let pageContent = null;

  if (currentPath === '/dashboard') {
    pageContent = (
      <DashboardPage
        equipmentList={equipmentList}
        recentActivities={recentActivities}
        onNavigate={navigate}
        onOpenCalibrateModal={handleOpenCalibrateModal}
      />
    );
  } else if (currentPath === '/equipment') {
    pageContent = (
      <EquipmentListPage
        equipmentList={equipmentList}
        onNavigate={navigate}
        onOpenCalibrateModal={handleOpenCalibrateModal}
      />
    );
  } else if (currentPath === '/equipment/new') {
    pageContent = (
      <AddEquipmentPage
        onNavigate={navigate}
        onAddEquipment={handleAddEquipment}
      />
    );
  } else if (currentPath.startsWith('/equipment/')) {
    const eqId = currentPath.replace('/equipment/', '');
    pageContent = (
      <EquipmentDetailsPage
        equipmentId={eqId}
        equipmentList={equipmentList}
        calibrationRecords={calibrationRecords}
        onNavigate={navigate}
        onOpenCalibrateModal={handleOpenCalibrateModal}
      />
    );
  } else if (currentPath === '/calibration') {
    pageContent = (
      <CalibrationPage
        equipmentList={equipmentList}
        calibrationRecords={calibrationRecords}
        onAddCalibrationRecord={handleAddCalibrationRecord}
        onNavigate={navigate}
      />
    );
  } else if (currentPath === '/calendar') {
    pageContent = (
      <CalendarPage
        calendarEvents={calendarEvents}
        onNavigate={navigate}
      />
    );
  } else if (currentPath === '/notifications') {
    pageContent = (
      <NotificationsPage
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllAsRead}
        onMarkAsRead={handleMarkAsRead}
        onNavigate={navigate}
      />
    );
  } else if (currentPath === '/reports') {
    pageContent = (
      <ReportsPage
        equipmentList={equipmentList}
        calibrationRecords={calibrationRecords}
      />
    );
  } else if (currentPath === '/settings') {
    pageContent = <SettingsPage />;
  } else {
    // Fallback to Dashboard
    pageContent = (
      <DashboardPage
        equipmentList={equipmentList}
        recentActivities={recentActivities}
        onNavigate={navigate}
        onOpenCalibrateModal={handleOpenCalibrateModal}
      />
    );
  }

  return (
    <AppLayout
      currentPath={currentPath}
      onNavigate={navigate}
      notifications={notifications}
      equipmentList={equipmentList}
    >
      {pageContent}

      {/* Global Quick Calibrate Modal */}
      {calibrateTarget && (
        <Modal
          isOpen={!!calibrateTarget}
          onClose={() => setCalibrateTarget(null)}
          title={`Log Calibration: ${calibrateTarget.name}`}
          subtitle={`Asset ID: ${calibrateTarget.code} · ${calibrateTarget.department}`}
          maxWidth="md"
        >
          <form onSubmit={handleQuickCalibrateSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Calibration Date" required>
                <Input
                  type="date"
                  value={calibrateForm.date}
                  onChange={(e) =>
                    setCalibrateForm({ ...calibrateForm, date: e.target.value })
                  }
                />
              </FormField>

              <FormField label="Result" required>
                <Select
                  value={calibrateForm.result}
                  onChange={(e) =>
                    setCalibrateForm({
                      ...calibrateForm,
                      result: e.target.value as CalibrationRecord['result'],
                    })
                  }
                >
                  <option value="Passed">Passed</option>
                  <option value="Passed with Adjustment">Passed with Adjustment</option>
                  <option value="Failed">Failed</option>
                  <option value="Limited Use">Limited Use</option>
                </Select>
              </FormField>
            </div>

            <FormField label="Certificate Number" required>
              <Input
                value={calibrateForm.certNumber}
                onChange={(e) =>
                  setCalibrateForm({ ...calibrateForm, certNumber: e.target.value })
                }
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="Service Provider" required>
              <Input
                value={calibrateForm.provider}
                onChange={(e) =>
                  setCalibrateForm({ ...calibrateForm, provider: e.target.value })
                }
              />
            </FormField>

            <FormField label="Technician Remarks">
              <Textarea
                rows={2}
                value={calibrateForm.remarks}
                onChange={(e) =>
                  setCalibrateForm({ ...calibrateForm, remarks: e.target.value })
                }
              />
            </FormField>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCalibrateTarget(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Confirm & Log Calibration
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </AppLayout>
  );
}
