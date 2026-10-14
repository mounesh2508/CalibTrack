import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  ExternalLink,
  Calendar,
  FileCheck2,
  Download,
  RefreshCw,
  AlertCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { FormField, Input, Select, Textarea } from '../components/common/FormField';
import { CalibrationSuccessModal } from '../components/common/CalibrationSuccessModal';
import { Equipment, CalibrationRecord } from '../types';
import { api } from '../services/api';

export type CalibrationOutcomeTab = 'All' | 'Passed' | 'Passed with Adjustment' | 'Failed';

interface CalibrationPageProps {
  equipmentList: Equipment[];
  calibrationRecords: CalibrationRecord[];
  onAddCalibrationRecord: (record: CalibrationRecord) => void;
  onNavigate: (path: string) => void;
  openLogModalDirectly?: boolean;
  onRefreshRecords?: () => Promise<void>;
}

export const CalibrationPage: React.FC<CalibrationPageProps> = ({
  equipmentList,
  calibrationRecords,
  onAddCalibrationRecord,
  onNavigate,
  onRefreshRecords,
}) => {
  const [activeTab, setActiveTab] = useState<CalibrationOutcomeTab>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<CalibrationRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Success Pop-up Modal State
  const [successRecord, setSuccessRecord] = useState<CalibrationRecord | null>(null);
  const [successEquipment, setSuccessEquipment] = useState<Equipment | null>(null);

  // New Record Form State
  const [newRecordForm, setNewRecordForm] = useState({
    equipmentId: equipmentList[0]?.id || '',
    calibrationDate: new Date().toISOString().split('T')[0],
    nextDueDate: '',
    serviceProvider: 'Metrology Global Solutions ISO 17025',
    technicianName: 'Alan Croft, Senior Metrologist',
    certificateNumber: `CERT-CAL-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    result: 'Passed' as CalibrationRecord['result'],
    standardUsed: 'NIST Traceable Reference Standard',
    environmentalTemp: '21.0 °C',
    environmentalHumidity: '45 % RH',
    remarks: 'Routine calibration verified. Linearity, repeatability, and hysteresis within specifications.',
  });

  // Compute outcome counts & summary statistics
  const counts = useMemo(() => {
    const all = calibrationRecords.length;
    const passed = calibrationRecords.filter((r) => r.result === 'Passed').length;
    const passedWithAdjustment = calibrationRecords.filter(
      (r) => r.result === 'Passed with Adjustment'
    ).length;
    const failed = calibrationRecords.filter((r) => r.result === 'Failed').length;

    return {
      all,
      passed,
      passedWithAdjustment,
      failed,
      passRate: all > 0 ? Math.round((passed / all) * 100) : 0,
      adjustRate: all > 0 ? Math.round((passedWithAdjustment / all) * 100) : 0,
      failRate: all > 0 ? Math.round((failed / all) * 100) : 0,
    };
  }, [calibrationRecords]);

  // Filtered records by empirical calibration outcome and search query
  const filteredRecords = useMemo(() => {
    return calibrationRecords.filter((rec) => {
      // Tab filter strictly by outcome result
      if (activeTab === 'Passed' && rec.result !== 'Passed') return false;
      if (activeTab === 'Passed with Adjustment' && rec.result !== 'Passed with Adjustment') return false;
      if (activeTab === 'Failed' && rec.result !== 'Failed') return false;

      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        rec.equipmentName.toLowerCase().includes(q) ||
        rec.equipmentCode.toLowerCase().includes(q) ||
        rec.serviceProvider.toLowerCase().includes(q) ||
        rec.certificateNumber.toLowerCase().includes(q) ||
        (rec.technicianName && rec.technicianName.toLowerCase().includes(q));

      return matchesSearch;
    });
  }, [calibrationRecords, activeTab, searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefreshRecords) await onRefreshRecords();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const targetEq = equipmentList.find((e) => e.id === newRecordForm.equipmentId) || equipmentList[0];
    if (!targetEq) {
      setSubmitError('Please select a valid registered laboratory instrument.');
      return;
    }

    const nextDate =
      newRecordForm.nextDueDate ||
      new Date(Date.now() + (targetEq.calibrationIntervalMonths * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    setIsSubmitting(true);

    try {
      const dbResult =
        newRecordForm.result === 'Failed'
          ? 'FAILED'
          : newRecordForm.result === 'Passed with Adjustment'
          ? 'CONDITIONAL'
          : 'PASSED';

      const result = await api.createCalibrationRecord({
        equipment_id: targetEq.id,
        calibration_date: newRecordForm.calibrationDate,
        next_due_date: nextDate,
        performed_by: newRecordForm.technicianName,
        calibration_provider: newRecordForm.serviceProvider,
        certificate_number: newRecordForm.certificateNumber,
        result: dbResult,
        remarks: newRecordForm.remarks,
      });

      const fullRecord: CalibrationRecord = {
        ...result.record,
        equipmentId: targetEq.id,
        equipmentCode: targetEq.code,
        equipmentName: targetEq.name,
      };

      // Pass mapped record to frontend state
      onAddCalibrationRecord(fullRecord);
      setIsAddModalOpen(false);
      setSuccessRecord(fullRecord);
      setSuccessEquipment(targetEq);

      // Reset form fields
      setNewRecordForm({
        equipmentId: equipmentList[0]?.id || '',
        calibrationDate: new Date().toISOString().split('T')[0],
        nextDueDate: '',
        serviceProvider: 'Metrology Global Solutions ISO 17025',
        technicianName: 'Alan Croft, Senior Metrologist',
        certificateNumber: `CERT-CAL-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        result: 'Passed',
        standardUsed: 'NIST Traceable Reference Standard',
        environmentalTemp: '21.0 °C',
        environmentalHumidity: '45 % RH',
        remarks: 'Routine calibration verified. Linearity, repeatability, and hysteresis within specifications.',
      });

      if (onRefreshRecords) {
        await onRefreshRecords();
      }
    } catch (err: any) {
      console.error('[CalibrationPage] Error saving record:', err);
      setSubmitError(err.message || 'Failed to submit calibration log to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Calibration Operations & Certificates
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              {calibrationRecords.length} Total Logs
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Log routine audits, track calibration certificates, and schedule upcoming verifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            disabled={isRefreshing}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (equipmentList.length === 0) {
                onNavigate('/equipment/new');
                return;
              }
              setSubmitError(null);
              setIsAddModalOpen(true);
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            + Log Calibration
          </Button>
        </div>
      </div>

      {/* Top Summary Metric Cards for Calibration Outcomes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Logged Audits */}
        <button
          type="button"
          onClick={() => setActiveTab('All')}
          className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'All'
              ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Audits
            </span>
            <div className={`p-2 rounded-lg ${activeTab === 'All' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
              {counts.all}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              100% verified logs
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Complete calibration audit history
          </p>
        </button>

        {/* Passed */}
        <button
          type="button"
          onClick={() => setActiveTab('Passed')}
          className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'Passed'
              ? 'bg-emerald-50/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Passed
            </span>
            <div className="p-2 rounded-lg bg-emerald-100/80 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-emerald-700">
              {counts.passed}
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
              {counts.passRate}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Within manufacturer & ISO tolerances
          </p>
        </button>

        {/* Passed with Adjustment */}
        <button
          type="button"
          onClick={() => setActiveTab('Passed with Adjustment')}
          className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'Passed with Adjustment'
              ? 'bg-amber-50/40 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              Passed with Adjustment
            </span>
            <div className="p-2 rounded-lg bg-amber-100/80 text-amber-700">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-amber-700">
              {counts.passedWithAdjustment}
            </span>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/60 px-1.5 py-0.5 rounded">
              {counts.adjustRate}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Zero-point offset / span compensated
          </p>
        </button>

        {/* Failed */}
        <button
          type="button"
          onClick={() => setActiveTab('Failed')}
          className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'Failed'
              ? 'bg-rose-50/40 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
              Failed
            </span>
            <div className="p-2 rounded-lg bg-rose-100/80 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-rose-700">
              {counts.failed}
            </span>
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-100/60 px-1.5 py-0.5 rounded">
              {counts.failRate}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Quarantine required & out-of-tolerance
          </p>
        </button>
      </div>

      {/* Outcome Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto text-xs font-medium border border-slate-200/60">
          {(
            [
              { key: 'All', label: 'All Records', count: counts.all, badgeClass: 'bg-slate-200 text-slate-800' },
              { key: 'Passed', label: 'Passed', count: counts.passed, badgeClass: 'bg-emerald-100 text-emerald-800' },
              { key: 'Passed with Adjustment', label: 'Passed with Adjustment', count: counts.passedWithAdjustment, badgeClass: 'bg-amber-100 text-amber-800' },
              { key: 'Failed', label: 'Failed', count: counts.failed, badgeClass: 'bg-rose-100 text-rose-800' },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full font-mono text-[11px] font-semibold transition-colors ${
                    isActive ? tab.badgeClass : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search records by cert #, code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Calibration Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Instrument</th>
                <th className="py-3 px-4">Certificate #</th>
                <th className="py-3 px-4">Calibration Date</th>
                <th className="py-3 px-4">Next Due Date</th>
                <th className="py-3 px-4">Service Provider</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4 text-right">Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    <p className="font-semibold text-slate-700 text-xs">
                      {calibrationRecords.length === 0
                        ? 'No calibration records logged'
                        : `No "${activeTab}" calibration records found`}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {calibrationRecords.length === 0
                        ? 'Register laboratory equipment first to schedule or log calibration certificates.'
                        : searchQuery
                        ? `No records matching "${searchQuery}" under ${activeTab} outcome.`
                        : `No records currently categorized with "${activeTab}" outcome.`}
                    </p>
                    {activeTab !== 'All' && (
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setActiveTab('All');
                            setSearchQuery('');
                          }}
                        >
                          View All Records
                        </Button>
                      </div>
                    )}
                    {equipmentList.length === 0 && (
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => onNavigate('/equipment/new')}
                          icon={<Plus className="w-3.5 h-3.5" />}
                        >
                          + Register First Instrument
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-semibold text-slate-900">{rec.equipmentName}</p>
                        <p className="font-mono text-[11px] text-slate-500 mt-0.5">{rec.equipmentCode}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {rec.certificateNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {rec.calibrationDate}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {rec.nextDueDate}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <p className="font-medium text-slate-800">{rec.serviceProvider}</p>
                      <p className="text-[10px] text-slate-400">{rec.technicianName}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                          rec.result === 'Passed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : rec.result === 'Passed with Adjustment'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            rec.result === 'Passed'
                              ? 'bg-emerald-500'
                              : rec.result === 'Passed with Adjustment'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        {rec.result}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setViewRecord(rec)}
                        icon={<ExternalLink className="w-3.5 h-3.5 text-blue-600" />}
                      >
                        View Cert
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Calibration Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddModalOpen(false)}
          title="Log Calibration Record"
        >
          <form onSubmit={handleCreateRecord} className="space-y-4">
            {submitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{submitError}</span>
              </div>
            )}

            <FormField label="Laboratory Instrument" required>
              {equipmentList.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center justify-between">
                  <span>No equipment registered in your laboratory yet.</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      onNavigate('/equipment/new');
                    }}
                  >
                    + Add Equipment First
                  </Button>
                </div>
              ) : (
                <Select
                  value={newRecordForm.equipmentId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const eq = equipmentList.find((x) => x.id === selectedId);
                    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                    setNewRecordForm((prev) => ({
                      ...prev,
                      equipmentId: selectedId,
                      certificateNumber: eq ? `CERT-${eq.code}-${dateStamp}` : prev.certificateNumber,
                      serviceProvider: eq?.manufacturer ? `${eq.manufacturer} Accredited Calibration Services` : prev.serviceProvider,
                      standardUsed: eq?.calibrationStandard || prev.standardUsed,
                      remarks: eq ? `Routine calibration verified for ${eq.name} (${eq.code}) within specifications.` : prev.remarks,
                    }));
                  }}
                  required
                >
                  <option value="">Select an instrument...</option>
                  {equipmentList.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.code} - {eq.name} ({eq.department})
                    </option>
                  ))}
                </Select>
              )}
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Calibration Date" required>
                <Input
                  type="date"
                  value={newRecordForm.calibrationDate}
                  onChange={(e) => setNewRecordForm({ ...newRecordForm, calibrationDate: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Next Due Date (Auto-calculated if blank)">
                <Input
                  type="date"
                  value={newRecordForm.nextDueDate}
                  onChange={(e) => setNewRecordForm({ ...newRecordForm, nextDueDate: e.target.value })}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Service Provider" required>
                <Input
                  value={newRecordForm.serviceProvider}
                  onChange={(e) => setNewRecordForm({ ...newRecordForm, serviceProvider: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Inspector / Metrologist" required>
                <Input
                  value={newRecordForm.technicianName}
                  onChange={(e) => setNewRecordForm({ ...newRecordForm, technicianName: e.target.value })}
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Certificate Number" required>
                <Input
                  value={newRecordForm.certificateNumber}
                  onChange={(e) => setNewRecordForm({ ...newRecordForm, certificateNumber: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Verification Outcome" required>
                <Select
                  value={newRecordForm.result}
                  onChange={(e) => setNewRecordForm({ ...newRecordForm, result: e.target.value as any })}
                >
                  <option value="Passed">Passed (Within Tolerance)</option>
                  <option value="Passed with Adjustment">Passed with Adjustment</option>
                  <option value="Failed">Failed (Quarantine Required)</option>
                </Select>
              </FormField>
            </div>

            <FormField label="Standards & Traceability">
              <Input
                value={newRecordForm.standardUsed}
                onChange={(e) => setNewRecordForm({ ...newRecordForm, standardUsed: e.target.value })}
              />
            </FormField>

            <FormField label="Audit Remarks">
              <Textarea
                rows={2}
                value={newRecordForm.remarks}
                onChange={(e) => setNewRecordForm({ ...newRecordForm, remarks: e.target.value })}
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={isSubmitting}
                icon={isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : undefined}
              >
                {isSubmitting ? 'Logging Record...' : 'Submit Calibration Log'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Record Modal */}
      {viewRecord && (
        <Modal
          isOpen={true}
          onClose={() => setViewRecord(null)}
          title={`Certificate: ${viewRecord.certificateNumber}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-800">ISO/IEC 17025 Certificate Details</span>
                <span
                  className={`inline-flex items-center gap-1.5 font-semibold px-2.5 py-0.5 rounded text-[11px] border ${
                    viewRecord.result === 'Passed'
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : viewRecord.result === 'Passed with Adjustment'
                      ? 'text-amber-700 bg-amber-50 border-amber-200'
                      : 'text-rose-700 bg-rose-50 border-rose-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      viewRecord.result === 'Passed'
                        ? 'bg-emerald-500'
                        : viewRecord.result === 'Passed with Adjustment'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  {viewRecord.result}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-400">Instrument:</span>
                  <p className="font-semibold text-slate-800">{viewRecord.equipmentName}</p>
                </div>
                <div>
                  <span className="text-slate-400">Equipment Code:</span>
                  <p className="font-mono text-slate-800">{viewRecord.equipmentCode}</p>
                </div>
                <div>
                  <span className="text-slate-400">Calibration Date:</span>
                  <p className="font-semibold text-slate-800">{viewRecord.calibrationDate}</p>
                </div>
                <div>
                  <span className="text-slate-400">Next Due Date:</span>
                  <p className="font-semibold text-slate-800">{viewRecord.nextDueDate}</p>
                </div>
                <div>
                  <span className="text-slate-400">Accredited Lab:</span>
                  <p className="font-semibold text-slate-800">{viewRecord.serviceProvider}</p>
                </div>
                <div>
                  <span className="text-slate-400">Technician:</span>
                  <p className="font-semibold text-slate-800">{viewRecord.technicianName}</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="font-semibold text-slate-800 block mb-1">Remarks & Observations</span>
              <p className="text-slate-600 leading-relaxed">{viewRecord.remarks}</p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setViewRecord(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Success Pop-up Modal */}
      {successRecord && (
        <CalibrationSuccessModal
          isOpen={true}
          onClose={() => {
            setSuccessRecord(null);
            setSuccessEquipment(null);
          }}
          onProceed={() => {
            setSuccessRecord(null);
            setSuccessEquipment(null);
          }}
          record={successRecord}
          equipment={successEquipment}
          title="Calibration Log Successful"
          proceedButtonText="Proceed to Records"
        />
      )}
    </div>
  );
};
