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
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { FormField, Input, Select, Textarea } from '../components/common/FormField';
import { Equipment, CalibrationRecord } from '../types';

interface CalibrationPageProps {
  equipmentList: Equipment[];
  calibrationRecords: CalibrationRecord[];
  onAddCalibrationRecord: (record: CalibrationRecord) => void;
  onNavigate: (path: string) => void;
  openLogModalDirectly?: boolean;
}

export const CalibrationPage: React.FC<CalibrationPageProps> = ({
  equipmentList,
  calibrationRecords,
  onAddCalibrationRecord,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Upcoming' | 'Due Soon' | 'Overdue' | 'Completed'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<CalibrationRecord | null>(null);

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
        // Also include upcoming by date
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

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEq = equipmentList.find((e) => e.id === newRecordForm.equipmentId) || equipmentList[0];

    const nextDate =
      newRecordForm.nextDueDate ||
      new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const record: CalibrationRecord = {
      id: `REC-${Date.now().toString().slice(-4)}`,
      equipmentId: targetEq.id,
      equipmentCode: targetEq.code,
      equipmentName: targetEq.name,
      calibrationDate: newRecordForm.calibrationDate,
      nextDueDate: nextDate,
      serviceProvider: newRecordForm.serviceProvider,
      technicianName: newRecordForm.technicianName,
      certificateNumber: newRecordForm.certificateNumber,
      result: newRecordForm.result,
      standardUsed: newRecordForm.standardUsed,
      environmentalTemp: newRecordForm.environmentalTemp,
      environmentalHumidity: newRecordForm.environmentalHumidity,
      remarks: newRecordForm.remarks,
      status: 'Completed',
    };

    onAddCalibrationRecord(record);
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Calibration</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track calibration records and compliance requirements.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => alert('Calibration log exported to CSV simulated.')}
          >
            Export Logs
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            + Add Calibration Record
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {(['All', 'Upcoming', 'Due Soon', 'Overdue', 'Completed'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                isActive
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Toolbar: Search & Date Filter */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by equipment, certificate, or provider..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-400">Date Range:</span>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="All">All Dates</option>
            <option value="last30">Last 30 Days</option>
            <option value="last90">Last Quarter</option>
            <option value="year2026">Year 2026</option>
          </select>
        </div>
      </div>

      {/* Calibration Records Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-medium uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Equipment</th>
                <th className="py-3 px-4">Calibration Date</th>
                <th className="py-3 px-4">Next Due Date</th>
                <th className="py-3 px-4">Service Provider</th>
                <th className="py-3 px-4">Certificate #</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No calibration records match this criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => setViewRecord(rec)}
                  >
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {rec.equipmentName}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                          {rec.equipmentCode}
                        </p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {rec.calibrationDate}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {rec.nextDueDate}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-800">{rec.serviceProvider}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{rec.technicianName}</p>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-blue-600">
                      {rec.certificateNumber}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={rec.result} size="sm" />
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={rec.status} size="sm" />
                    </td>

                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setViewRecord(rec)}
                        icon={<ExternalLink className="w-3.5 h-3.5" />}
                      >
                        View
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
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Calibration Record"
        subtitle="Log calibration verification protocol and findings"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateRecord} className="space-y-4">
          <FormField label="Target Equipment" required>
            <Select
              value={newRecordForm.equipmentId}
              onChange={(e) =>
                setNewRecordForm({ ...newRecordForm, equipmentId: e.target.value })
              }
            >
              {equipmentList.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.code} - {eq.name} ({eq.department})
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Calibration Date" required>
              <Input
                type="date"
                value={newRecordForm.calibrationDate}
                onChange={(e) =>
                  setNewRecordForm({ ...newRecordForm, calibrationDate: e.target.value })
                }
              />
            </FormField>

            <FormField label="Next Due Date" required helperText="Optional - defaults to +6 mo">
              <Input
                type="date"
                value={newRecordForm.nextDueDate}
                onChange={(e) =>
                  setNewRecordForm({ ...newRecordForm, nextDueDate: e.target.value })
                }
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Service Provider / Lab" required>
              <Input
                value={newRecordForm.serviceProvider}
                onChange={(e) =>
                  setNewRecordForm({ ...newRecordForm, serviceProvider: e.target.value })
                }
              />
            </FormField>

            <FormField label="Technician / Metrologist" required>
              <Input
                value={newRecordForm.technicianName}
                onChange={(e) =>
                  setNewRecordForm({ ...newRecordForm, technicianName: e.target.value })
                }
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Certificate Number" required>
              <Input
                value={newRecordForm.certificateNumber}
                onChange={(e) =>
                  setNewRecordForm({ ...newRecordForm, certificateNumber: e.target.value })
                }
                className="font-mono"
              />
            </FormField>

            <FormField label="Calibration Result" required>
              <Select
                value={newRecordForm.result}
                onChange={(e) =>
                  setNewRecordForm({
                    ...newRecordForm,
                    result: e.target.value as CalibrationRecord['result'],
                  })
                }
              >
                <option value="Passed">Passed (Fully Compliant)</option>
                <option value="Passed with Adjustment">Passed with Adjustment</option>
                <option value="Failed">Failed (Out of Tolerance)</option>
                <option value="Limited Use">Limited Use (Derated)</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Standards Used">
            <Input
              value={newRecordForm.standardUsed}
              onChange={(e) =>
                setNewRecordForm({ ...newRecordForm, standardUsed: e.target.value })
              }
            />
          </FormField>

          <FormField label="Technical Findings & Remarks">
            <Textarea
              rows={3}
              value={newRecordForm.remarks}
              onChange={(e) =>
                setNewRecordForm({ ...newRecordForm, remarks: e.target.value })
              }
            />
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Calibration Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Record Details Modal */}
      {viewRecord && (
        <Modal
          isOpen={!!viewRecord}
          onClose={() => setViewRecord(null)}
          title={`Calibration Certificate - ${viewRecord.certificateNumber}`}
          subtitle={`Instrument: ${viewRecord.equipmentName} (${viewRecord.equipmentCode})`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setViewRecord(null);
                  onNavigate(`/equipment/${viewRecord.equipmentId}`);
                }}
              >
                Go to Equipment
              </Button>
              <Button variant="primary" size="sm" onClick={() => setViewRecord(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Service Provider:</span>
                <span className="font-semibold text-slate-900">{viewRecord.serviceProvider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Certified Metrologist:</span>
                <span className="text-slate-800 font-medium">{viewRecord.technicianName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Calibration Verification Date:</span>
                <span className="text-slate-800 font-medium">{viewRecord.calibrationDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Recalibration Due Date:</span>
                <span className="text-slate-800 font-medium">{viewRecord.nextDueDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Result Finding:</span>
                <StatusBadge status={viewRecord.result} size="sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[11px]">Lab Temperature</span>
                <span className="font-mono text-slate-800 font-medium">{viewRecord.environmentalTemp}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Lab Humidity</span>
                <span className="font-mono text-slate-800 font-medium">{viewRecord.environmentalHumidity}</span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-slate-800 block mb-1">Standard / Mass Reference</span>
              <p className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-700 font-mono text-[11px]">
                {viewRecord.standardUsed}
              </p>
            </div>

            <div>
              <span className="font-semibold text-slate-800 block mb-1">Remarks & Adjustments</span>
              <p className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-700 leading-relaxed">
                {viewRecord.remarks}
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
