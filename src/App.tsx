import React, { useState, useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { EquipmentListPage } from './pages/EquipmentListPage';
import { EquipmentDetailsPage } from './pages/EquipmentDetailsPage';
import { AddEquipmentPage } from './pages/AddEquipmentPage';
import { CalibrationPage } from './pages/CalibrationPage';
import { CalendarPage } from './pages/CalendarPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { Modal } from './components/common/Modal';
import { CalibrationSuccessModal } from './components/common/CalibrationSuccessModal';
import { FormField, Input, Select, Textarea } from './components/common/FormField';
import { Button } from './components/common/Button';
import {
  initialEquipmentList,
  initialCalibrationRecords,
  initialNotifications,
  initialRecentActivities,
  initialCalendarEvents,
} from './data/mockData';
import { Equipment, CalibrationRecord, NotificationItem, RecentActivity, CalendarEvent, AuthUser } from './types';
import { api, mapBackendCalibrationToFrontend } from './services/api';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const p = window.location.pathname;
    if (p === '/' || !p) return '/dashboard';
    return p;
  });

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const stored = api.getStoredUser();
    if (!stored) {
      const defaultAdmin: AuthUser = {
        id: 'usr-admin-01',
        name: 'Mounesh A',
        email: 'asokanmounesh@gmail.com',
        role: 'ADMIN',
      };
      api.setStoredUser(defaultAdmin);
      return defaultAdmin;
    }
    if (stored.id === 'usr-admin-01' || stored.email === 'admin@calibtrack-lab.com' || stored.email === 'sarah.lin@calibtrack.lab') {
      const updatedAdmin: AuthUser = {
        ...stored,
        id: 'usr-admin-01',
        name: 'Mounesh A',
        email: 'asokanmounesh@gmail.com',
        role: 'ADMIN',
      };
      api.setStoredUser(updatedAdmin);
      return updatedAdmin;
    }
    return stored;
  });
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  // Initialize with local cache or empty array
  const [equipmentList, setEquipmentList] = useState<Equipment[]>(() => {
    try {
      const stored = localStorage.getItem('calibtrack_local_equipment');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [calibrationRecords, setCalibrationRecords] = useState<CalibrationRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);

  // Success Confirmation Pop-up Modal State
  const [successCalibrateRecord, setSuccessCalibrateRecord] = useState<CalibrationRecord | null>(null);
  const [successEquipment, setSuccessEquipment] = useState<Equipment | null>(null);

  // Sync with backend API
  const loadBackendData = async () => {
    try {
      // Background check: evaluate due soon & overdue calibrations and sync Gmail alerts
      await api.triggerCalibrationAlertEmails().catch(() => null);

      const [equipData, notifsData, calibData] = await Promise.all([
        api.fetchEquipment().catch(() => null),
        api.fetchNotifications().catch(() => null),
        api.fetchCalibrationRecords().catch(() => null),
      ]);

      const items = equipData && Array.isArray(equipData.items) ? equipData.items : [];
      const equipIds = new Set(items.map((e) => e.id));

      if (equipData !== null) {
        setEquipmentList(items);
        setApiConnected(true);
      } else {
        setApiConnected(false);
      }

      if (items.length === 0) {
        // Zero registered equipment: strictly zero out calibrations, activities, and instrument alerts
        setCalibrationRecords([]);
        setRecentActivities([]);
        if (notifsData && Array.isArray(notifsData.items)) {
          setNotifications(notifsData.items.filter((n) => !n.equipmentId && n.category === 'system'));
        } else {
          setNotifications([]);
        }
      } else {
        // Filter calibrations and notifications to valid registered equipment
        if (Array.isArray(calibData)) {
          const equipMap = new Map(items.map((e) => [e.id, e]));
          const validCalibs = calibData
            .filter((r) => equipIds.has(r.equipmentId) || items.some((e) => e.code === r.equipmentCode))
            .map((r) => {
              const matchedEq = equipMap.get(r.equipmentId) || items.find((e) => e.code === r.equipmentCode);
              return {
                ...r,
                equipmentCode: (r.equipmentCode && r.equipmentCode !== 'EQ-LOGGED' && r.equipmentCode !== 'EQ-LOG')
                  ? r.equipmentCode
                  : matchedEq?.code || r.equipmentCode,
                equipmentName: (r.equipmentName && r.equipmentName !== 'Laboratory Instrument')
                  ? r.equipmentName
                  : matchedEq?.name || r.equipmentName,
              };
            });
          setCalibrationRecords(validCalibs);
          const activities: RecentActivity[] = validCalibs.slice(0, 8).map((r: any) => ({
            id: `ACT-${r.id}`,
            type: 'calibration_completed',
            title: 'Calibration Completed',
            description: `${r.equipmentName || 'Instrument'} (${r.equipmentCode || 'EQ'}) calibrated by ${r.serviceProvider || r.technicianName}. Result: ${r.result}.`,
            timestamp: r.calibrationDate || 'Recently',
            actor: r.technicianName || 'Technician',
            equipmentCode: r.equipmentCode,
          }));
          setRecentActivities(activities);
        }

        if (notifsData && Array.isArray(notifsData.items)) {
          const equipCodes = new Set(items.map((e) => (e.code || '').toUpperCase()));
          const validNotifs = notifsData.items.filter(
            (n) =>
              !n.equipmentId ||
              equipIds.has(n.equipmentId) ||
              (n.equipmentCode && equipCodes.has(n.equipmentCode.toUpperCase()))
          );
          setNotifications(validNotifs);
        }
      }
    } catch (err) {
      console.warn('[CalibTrack] Using clean data state:', err);
      setApiConnected(false);
    }
  };

  useEffect(() => {
    loadBackendData();
  }, [currentUser]);

  // Listen for unauthorized 401 events & verify stored session
  useEffect(() => {
    api.setUnauthorizedListener((msg: string) => {
      setCurrentUser(null);
      setSessionNotice(msg || 'Your session has expired. Please sign in again.');
      navigate('/login');
    });

    if (api.getStoredToken()) {
      api.fetchCurrentUser()
        .then((user) => setCurrentUser(user))
        .catch(() => {
          api.clearAuthSession();
          setCurrentUser(null);
        });
    }

    return () => {
      api.setUnauthorizedListener(null);
    };
  }, []);

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setSessionNotice('You have been safely signed out.');
    navigate('/login');
  };

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

  const handleAddEquipment = async (newEquip: Equipment) => {
    // Optimistic update
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

    // Refresh from database
    await loadBackendData();
  };

  const handleUpdateEquipment = async (id: string, updates: any) => {
    await api.updateEquipment(id, updates);
    await loadBackendData();
  };

  const handleDeleteEquipment = async (id: string) => {
    await api.deleteEquipment(id);
    setEquipmentList((prev) => prev.filter((e) => e.id !== id && e.code !== id));
    setCalibrationRecords((prev) => prev.filter((r) => r.equipmentId !== id));
    await loadBackendData();
  };

  const handleAddCalibrationRecord = async (record: CalibrationRecord) => {
    // Optimistic update
    setCalibrationRecords((prev) => [record, ...prev]);

    // Update equipment dates
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

    // Add recent activity with real equipment name and code
    const activity: RecentActivity = {
      id: `ACT-${Date.now()}`,
      type: 'calibration_completed',
      title: 'Calibration completed',
      description: `${record.equipmentName} (${record.equipmentCode}) successfully calibrated by ${record.serviceProvider}.`,
      timestamp: 'Just now',
      actor: record.technicianName,
      equipmentCode: record.equipmentCode,
    };
    setRecentActivities((prev) => [activity, ...prev]);

    await loadBackendData();
  };

  const handleOpenCalibrateModal = (eq: Equipment) => {
    setCalibrateTarget(eq);
    const defaultProvider = eq.manufacturer
      ? `${eq.manufacturer} Accredited Calibration Services`
      : 'Metrology Global Solutions ISO 17025';

    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const certNumber = `CERT-${eq.code}-${dateStamp}`;

    setCalibrateForm({
      date: new Date().toISOString().split('T')[0],
      provider: defaultProvider,
      certNumber,
      result: 'Passed',
      remarks: `Instrument ${eq.name} (${eq.code}) calibrated and verified within manufacturer tolerance specifications.`,
    });
  };

  const handleQuickCalibrateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calibrateTarget) return;

    const currentTarget = calibrateTarget;
    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + currentTarget.calibrationIntervalMonths);
    const nextDueDateStr = nextDate.toISOString().split('T')[0];

    const dbResult =
      calibrateForm.result === 'Failed'
        ? 'FAILED'
        : calibrateForm.result === 'Passed with Adjustment'
        ? 'CONDITIONAL'
        : 'PASSED';

    let savedRecord: CalibrationRecord | null = null;

    try {
      const result = await api.createCalibrationRecord({
        equipment_id: currentTarget.id,
        calibration_date: calibrateForm.date,
        next_due_date: nextDueDateStr,
        performed_by: currentUser?.name || 'Alan Croft, Senior Metrologist',
        calibration_provider: calibrateForm.provider,
        certificate_number: calibrateForm.certNumber || `CERT-${currentTarget.code}-${Date.now().toString().slice(-4)}`,
        result: dbResult,
        remarks: calibrateForm.remarks,
      });

      // Explicitly lock down the target equipment's true name and code
      savedRecord = {
        ...result.record,
        equipmentId: currentTarget.id,
        equipmentCode: currentTarget.code,
        equipmentName: currentTarget.name,
      };
      handleAddCalibrationRecord(savedRecord);
    } catch {
      // Fallback
      savedRecord = {
        id: `REC-${Date.now()}`,
        equipmentId: currentTarget.id,
        equipmentCode: currentTarget.code,
        equipmentName: currentTarget.name,
        calibrationDate: calibrateForm.date,
        nextDueDate: nextDueDateStr,
        serviceProvider: calibrateForm.provider,
        technicianName: currentUser?.name || 'Alan Croft, Senior Metrologist',
        certificateNumber: calibrateForm.certNumber || `CERT-${currentTarget.code}-${Date.now().toString().slice(-4)}`,
        result: calibrateForm.result,
        standardUsed: currentTarget.calibrationStandard || 'NIST Traceable Reference',
        environmentalTemp: '21.0 °C',
        environmentalHumidity: '45 % RH',
        remarks: calibrateForm.remarks,
        status: 'Completed',
      };
      handleAddCalibrationRecord(savedRecord);
    }

    setCalibrateTarget(null);

    // Show calibration success pop-up modal with instrument details
    if (savedRecord) {
      setSuccessCalibrateRecord(savedRecord);
      setSuccessEquipment(currentTarget);
    }
  };

  const handleProceedToCalibrationFromSuccess = () => {
    setSuccessCalibrateRecord(null);
    setSuccessEquipment(null);
    navigate('/calibration');
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await api.markAllNotificationsRead();
  };

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await api.markNotificationRead(id);
  };

  // Route: Staff Email Verification
  if (currentPath.startsWith('/verify-email')) {
    return <VerifyEmailPage onNavigate={navigate} />;
  }

  // Authentication Guard: Redirect unauthenticated users to Login
  if (!currentUser || currentPath === '/login') {
    return (
      <LoginPage
        onLogin={(user) => {
          setCurrentUser(user);
          setSessionNotice(null);
          navigate('/dashboard');
          loadBackendData();
        }}
        sessionNotice={sessionNotice}
        onNavigate={navigate}
      />
    );
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
        onRefreshList={loadBackendData}
        onDeleteEquipment={handleDeleteEquipment}
        onUpdateEquipment={handleUpdateEquipment}
        currentUser={currentUser}
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
        onDeleteEquipment={handleDeleteEquipment}
        onRefreshList={loadBackendData}
        currentUser={currentUser}
      />
    );
  } else if (currentPath === '/calibration') {
    pageContent = (
      <CalibrationPage
        equipmentList={equipmentList}
        calibrationRecords={calibrationRecords}
        onAddCalibrationRecord={handleAddCalibrationRecord}
        onNavigate={navigate}
        onRefreshRecords={loadBackendData}
      />
    );
  } else if (currentPath === '/calendar') {
    const liveCalendarEvents: CalendarEvent[] = equipmentList.map((eq) => ({
      id: `EVT-${eq.id}`,
      title: `${eq.name} (${eq.code})`,
      equipmentId: eq.id,
      equipmentCode: eq.code,
      equipmentName: eq.name,
      date: eq.nextCalibrationDate,
      type:
        eq.status === 'overdue'
          ? 'overdue'
          : eq.status === 'due_soon'
          ? 'due_soon'
          : 'upcoming',
      provider: 'Metrology Global Solutions ISO 17025',
      location: `${eq.department} - ${eq.location}`,
      time: '09:00 AM',
    }));

    pageContent = (
      <CalendarPage
        calendarEvents={liveCalendarEvents}
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
        onRefreshNotifications={loadBackendData}
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
    pageContent = <SettingsPage currentUser={currentUser} />;
  } else {
    // Fallback to Dashboard
    pageContent = (
      <DashboardPage
        equipmentList={equipmentList}
        recentActivities={recentActivities}
        onNavigate={navigate}
        onOpenCalibrateModal={handleOpenCalibrateModal}
        onRefreshGlobalData={loadBackendData}
      />
    );
  }

  return (
    <AppLayout
      currentPath={currentPath}
      onNavigate={navigate}
      notifications={notifications}
      equipmentList={equipmentList}
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      {pageContent}

      {/* Quick Calibrate Modal */}
      {calibrateTarget && (
        <Modal
          isOpen={true}
          onClose={() => setCalibrateTarget(null)}
          title={`Quick Calibrate: ${calibrateTarget.name} (${calibrateTarget.code})`}
        >
          <form onSubmit={handleQuickCalibrateSubmit} className="space-y-4">
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-2 text-slate-700">
              <div className="flex justify-between items-start pb-1.5 border-b border-blue-200/60">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 block">Target Asset</span>
                  <span className="font-bold text-slate-900 text-sm">{calibrateTarget.name}</span>
                </div>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-white border border-blue-300 rounded text-blue-700 shadow-2xs">
                  {calibrateTarget.code}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400">Manufacturer:</span>{' '}
                  <span className="font-medium text-slate-800">{calibrateTarget.manufacturer}</span>
                </div>
                <div>
                  <span className="text-slate-400">Model:</span>{' '}
                  <span className="font-medium text-slate-800">{calibrateTarget.model}</span>
                </div>
                <div>
                  <span className="text-slate-400">Department:</span>{' '}
                  <span className="font-medium text-slate-800">{calibrateTarget.department}</span>
                </div>
                <div>
                  <span className="text-slate-400">Location:</span>{' '}
                  <span className="font-medium text-slate-800">{calibrateTarget.location}</span>
                </div>
                <div>
                  <span className="text-slate-400">Cycle:</span>{' '}
                  <span className="font-medium text-slate-800">Every {calibrateTarget.calibrationIntervalMonths} Months</span>
                </div>
                <div>
                  <span className="text-slate-400">Serial #:</span>{' '}
                  <span className="font-mono text-slate-800">{calibrateTarget.serialNumber || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Verification Date" required>
                <Input
                  type="date"
                  value={calibrateForm.date}
                  onChange={(e) => setCalibrateForm({ ...calibrateForm, date: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Calibration Outcome" required>
                <Select
                  value={calibrateForm.result}
                  onChange={(e) => setCalibrateForm({ ...calibrateForm, result: e.target.value as any })}
                >
                  <option value="Passed">Passed (Fully Compliant)</option>
                  <option value="Passed with Adjustment">Passed with Adjustment</option>
                  <option value="Failed">Failed (Quarantined)</option>
                </Select>
              </FormField>
            </div>

            <FormField label="Accredited Provider" required>
              <Input
                value={calibrateForm.provider}
                onChange={(e) => setCalibrateForm({ ...calibrateForm, provider: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Certificate / Log #" required>
              <Input
                value={calibrateForm.certNumber}
                onChange={(e) => setCalibrateForm({ ...calibrateForm, certNumber: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Remarks & Calibration Tolerances">
              <Textarea
                rows={2}
                value={calibrateForm.remarks}
                onChange={(e) => setCalibrateForm({ ...calibrateForm, remarks: e.target.value })}
              />
            </FormField>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setCalibrateTarget(null)}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Complete Calibration
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Calibration Success Pop-up Modal */}
      {successCalibrateRecord && (
        <CalibrationSuccessModal
          isOpen={true}
          onClose={() => {
            setSuccessCalibrateRecord(null);
            setSuccessEquipment(null);
          }}
          onProceed={handleProceedToCalibrationFromSuccess}
          record={successCalibrateRecord}
          equipment={successEquipment}
          title="Calibration Log Successful"
          proceedButtonText="Proceed to Calibration Page"
        />
      )}
    </AppLayout>
  );
}
