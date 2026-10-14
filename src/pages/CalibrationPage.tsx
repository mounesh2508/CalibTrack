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
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { FormField, Input, Select, Textarea } from '../components/common/FormField';
import { Equipment, CalibrationRecord } from '../types';
import { api } from '../services/api';

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
  const [activeTab, setActiveTab] = useState<'All' | 'Upcoming' | 'Due Soon' | 'Overdue' | 'Completed'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<CalibrationRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Filtered records
  const filteredRecords = useMemo(() => {
    return calibrationRecords.filter((rec) => {
      // Tab filter
      if (activeTab === 'Completed' && rec.status !== 'Completed') return false;
      if (activeTab === 'Overdue' && rec.status !== 'Overdue') return false;
      if (activeTab === 'Upcoming' && rec.status !== 'Scheduled' && rec.status !== 'In Progress') {
        const isFuture = new Date(rec.nextDueDate) >= new Date();
        if (!isFuture) return false;
      }
      if (activeTab === 'Due Soon') {
        const eq = equipmentList.find((e) => e.id === rec.equipmentId);
        if (eq && eq.status !== 'due_soon') return false;
      }

      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        rec.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.equipmentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.serviceProvider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.certificateNumber.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [calibrationRecords, equipmentList, activeTab, searchQuery]);

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

      // Pass mapped record to frontend state
      onAddCalibrationRecord(result.record);
      setIsAddModalOpen(false);

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
              setSubmitError(null);
              setIsAddModalOpen(true);
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            + Log Calibration
          </Button>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto text-xs font-medium">
          {(['All', 'Completed', 'Due Soon', 'Overdue'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search records by cert # or name..."
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
                    No calibration records found matching current criteria.
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
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          rec.result === 'Passed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : rec.result === 'Passed with Adjustment'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
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
                  onChange={(e) => setNewRecordForm({ ...newRecordForm, equipmentId: e.target.value })}
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
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
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
    </div>
  );
};
