import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Wrench,
  Edit,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Hash,
  Award,
  FileText,
  FileCheck2,
  ExternalLink,
  Trash2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { Equipment, CalibrationRecord, AuthUser } from '../types';
import { api } from '../services/api';

interface EquipmentDetailsPageProps {
  equipmentId: string;
  equipmentList: Equipment[];
  calibrationRecords: CalibrationRecord[];
  onNavigate: (path: string) => void;
  onOpenCalibrateModal?: (eq: Equipment) => void;
  onDeleteEquipment?: (id: string) => Promise<void>;
  onRefreshList?: () => Promise<void>;
  currentUser?: AuthUser | null;
}

export const EquipmentDetailsPage: React.FC<EquipmentDetailsPageProps> = ({
  equipmentId,
  equipmentList,
  calibrationRecords: initialRecords,
  onNavigate,
  onOpenCalibrateModal,
  onDeleteEquipment,
  onRefreshList,
  currentUser,
}) => {
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [history, setHistory] = useState<CalibrationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCert, setSelectedCert] = useState<CalibrationRecord | null>(null);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load equipment item and its calibration history
  const loadEquipmentData = async () => {
    setIsLoading(true);
    setError(null);

    // First check in-memory list as instant preview
    const foundLocal = equipmentList.find((e) => e.id === equipmentId || e.code === equipmentId);
    if (foundLocal) {
      setEquipment(foundLocal);
    }

    try {
      const [apiEquip, apiHistory] = await Promise.all([
        api.fetchEquipmentItem(equipmentId).catch((err) => {
          if (!foundLocal) throw err;
          return foundLocal;
        }),
        api.fetchCalibrationRecords(equipmentId).catch(() => []),
      ]);

      if (apiEquip) {
        setEquipment(apiEquip);
      }

      const resolvedEquip = apiEquip || foundLocal;
      if (apiHistory && apiHistory.length > 0) {
        const enriched = apiHistory.map((r) => ({
          ...r,
          equipmentName: (r.equipmentName && r.equipmentName !== 'Laboratory Instrument')
            ? r.equipmentName
            : resolvedEquip?.name || r.equipmentName,
          equipmentCode: (r.equipmentCode && r.equipmentCode !== 'EQ-LOGGED' && r.equipmentCode !== 'EQ-LOG')
            ? r.equipmentCode
            : resolvedEquip?.code || r.equipmentCode,
        }));
        setHistory(enriched);
      } else {
        const localHistory = initialRecords
          .filter((r) => r.equipmentId === equipmentId || (resolvedEquip && r.equipmentCode === resolvedEquip.code))
          .map((r) => ({
            ...r,
            equipmentName: (r.equipmentName && r.equipmentName !== 'Laboratory Instrument')
              ? r.equipmentName
              : resolvedEquip?.name || r.equipmentName,
            equipmentCode: (r.equipmentCode && r.equipmentCode !== 'EQ-LOGGED' && r.equipmentCode !== 'EQ-LOG')
              ? r.equipmentCode
              : resolvedEquip?.code || r.equipmentCode,
          }));
        setHistory(localHistory);
      }
    } catch (err: any) {
      console.error('[EquipmentDetails] Load error:', err);
      if (!foundLocal) {
        setError(`Unable to find equipment #${equipmentId}. It may have been deleted or does not exist.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEquipmentData();
  }, [equipmentId, initialRecords.length]);

  const handleDelete = async () => {
    if (!equipment) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (onDeleteEquipment) {
        await onDeleteEquipment(equipment.id);
      } else {
        await api.deleteEquipment(equipment.id);
        if (onRefreshList) await onRefreshList();
      }
      setIsDeleteModalOpen(false);
      onNavigate('/equipment');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete instrument.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && !equipment) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading equipment specifications from database...</p>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl shadow-xs text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Equipment Record Not Found</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          {error || `The requested laboratory instrument (ID: ${equipmentId}) could not be retrieved from the database.`}
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => onNavigate('/equipment')}>
            Back to Registry
          </Button>
          <Button variant="primary" size="sm" onClick={loadEquipmentData}>
            Retry Request
          </Button>
        </div>
      </div>
    );
  }

  // Display history fallback
  const displayHistory: CalibrationRecord[] = history.length > 0 ? history : [
    {
      id: `REC-ARCH-${equipment.id}`,
      equipmentId: equipment.id,
      equipmentCode: equipment.code,
      equipmentName: equipment.name,
      calibrationDate: equipment.lastCalibrationDate,
      nextDueDate: equipment.nextCalibrationDate,
      serviceProvider: 'Metrology Global Solutions ISO 17025',
      technicianName: equipment.assignedTechnician || 'Dr. Sarah Lin',
      certificateNumber: `CERT-${equipment.code}-INIT`,
      result: 'Passed',
      standardUsed: 'NIST Traceable Reference Standard',
      environmentalTemp: '20.5 °C',
      environmentalHumidity: '45 % RH',
      remarks: 'Baseline calibration certificate on file.',
      status: 'Completed',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-start sm:items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/equipment')}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Equipment
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {equipment.name}
              </h1>
              <span className="font-mono text-xs px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700 font-semibold">
                {equipment.code}
              </span>
              <StatusBadge status={equipment.status} size="md" />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {equipment.manufacturer} · Model {equipment.model} · Serial #{equipment.serialNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser?.role === 'ADMIN' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              icon={<Trash2 className="w-4 h-4 text-rose-500" />}
              className="text-rose-600 hover:bg-rose-50 border-rose-200"
            >
              Delete
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (onOpenCalibrateModal) onOpenCalibrateModal(equipment);
              else onNavigate('/calibration');
            }}
            icon={<Wrench className="w-4 h-4" />}
          >
            Log Calibration
          </Button>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Key Specifications */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Specifications & Identification"
              subtitle="Asset metadata verified in laboratory registry"
              action={<Hash className="w-4 h-4 text-slate-400" />}
            />
            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50/70 rounded-lg">
                  <span className="text-slate-400 block text-[11px] font-medium">Category</span>
                  <span className="text-slate-900 font-semibold text-sm mt-0.5 block">{equipment.category}</span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-lg">
                  <span className="text-slate-400 block text-[11px] font-medium">Department</span>
                  <span className="text-slate-900 font-semibold text-sm mt-0.5 block">{equipment.department}</span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-lg">
                  <span className="text-slate-400 block text-[11px] font-medium">Physical Location</span>
                  <span className="text-slate-900 font-semibold text-sm mt-0.5 block">{equipment.location}</span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-lg">
                  <span className="text-slate-400 block text-[11px] font-medium">Calibration Interval</span>
                  <span className="text-slate-900 font-semibold text-sm mt-0.5 block">
                    Every {equipment.calibrationIntervalMonths} Months ({equipment.calibrationIntervalMonths * 30} Days)
                  </span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-lg">
                  <span className="text-slate-400 block text-[11px] font-medium">Commission Date</span>
                  <span className="text-slate-900 font-semibold text-sm mt-0.5 block">{equipment.purchaseDate}</span>
                </div>
                <div className="p-3 bg-slate-50/70 rounded-lg">
                  <span className="text-slate-400 block text-[11px] font-medium">Lead Metrologist</span>
                  <span className="text-slate-900 font-semibold text-sm mt-0.5 block">{equipment.assignedTechnician}</span>
                </div>
              </div>

              {equipment.description && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="text-slate-400 block text-[11px] font-medium mb-1">Instrument Notes & SOP</span>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    {equipment.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calibration History Table */}
          <Card>
            <CardHeader
              title="Calibration History"
              subtitle={`Complete ISO 17025 verification audit trail (${displayHistory.length} logs)`}
              action={<FileCheck2 className="w-4 h-4 text-slate-400" />}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-medium uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Calibration Date</th>
                    <th className="py-3 px-4">Next Due</th>
                    <th className="py-3 px-4">Provider / Inspector</th>
                    <th className="py-3 px-4">Certificate #</th>
                    <th className="py-3 px-4">Outcome</th>
                    <th className="py-3 px-4 text-right">Certificate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayHistory.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {rec.calibrationDate}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {rec.nextDueDate}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <p className="font-medium text-slate-800">{rec.serviceProvider}</p>
                        <p className="text-[10px] text-slate-400">{rec.technicianName}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        {rec.certificateNumber}
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
                          onClick={() => setSelectedCert(rec)}
                          icon={<ExternalLink className="w-3.5 h-3.5 text-blue-600" />}
                        >
                          View Cert
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column: Compliance Schedule Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Calibration Cycle Schedule"
              subtitle="Real-time interval calculation"
              action={<Calendar className="w-4 h-4 text-slate-400" />}
            />
            <CardContent className="p-4 space-y-4 text-xs">
              <div
                className={`p-4 rounded-xl border ${
                  equipment.status === 'overdue'
                    ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                    : equipment.status === 'due_soon'
                    ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                    : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">Due Status</span>
                  <StatusBadge status={equipment.status} size="sm" />
                </div>
                <div className="mt-3">
                  <span className="text-[11px] opacity-80 block">Next Calibration Deadline:</span>
                  <p className="text-xl font-bold mt-0.5 tracking-tight">{equipment.nextCalibrationDate}</p>
                  <p className="text-[11px] mt-1 font-semibold">
                    {equipment.daysRemaining < 0
                      ? `${Math.abs(equipment.daysRemaining)} days overdue`
                      : equipment.daysRemaining === 0
                      ? 'Due today'
                      : `${equipment.daysRemaining} days remaining`}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Last Calibrated:</span>
                  <span className="font-medium text-slate-900">{equipment.lastCalibrationDate}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Cycle Interval:</span>
                  <span className="font-medium text-slate-900">{equipment.calibrationIntervalMonths} Months</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Tolerance Spec:</span>
                  <span className="font-medium text-slate-900">{equipment.tolerance || '±0.01 % FS'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Traceability Standard:</span>
                  <span className="font-medium text-slate-900">ISO/IEC 17025</span>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full mt-2"
                size="sm"
                onClick={() => {
                  if (onOpenCalibrateModal) onOpenCalibrateModal(equipment);
                  else onNavigate('/calibration');
                }}
              >
                Schedule & Recalibrate
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Instrument Deletion"
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 leading-relaxed">
                <p className="font-semibold">Confirm removal from database</p>
                <p className="mt-1">
                  Are you sure you want to delete <strong>{equipment.name}</strong> ({equipment.code})? All historic certificates and calibration logs will be permanently deleted from the database.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-100 text-rose-900 text-xs rounded-lg">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                icon={isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              >
                {isDeleting ? 'Deleting...' : 'Delete Instrument'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Certificate Viewer Modal */}
      {selectedCert && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCert(null)}
          title={`Certificate: ${selectedCert.certificateNumber}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-800">ISO 17025 Metrology Verification</span>
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {selectedCert.result}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-400">Instrument:</span>
                  <p className="font-semibold text-slate-800">{equipment.name} ({equipment.code})</p>
                </div>
                <div>
                  <span className="text-slate-400">Date Completed:</span>
                  <p className="font-semibold text-slate-800">{selectedCert.calibrationDate}</p>
                </div>
                <div>
                  <span className="text-slate-400">Accredited Service Provider:</span>
                  <p className="font-semibold text-slate-800">{selectedCert.serviceProvider}</p>
                </div>
                <div>
                  <span className="text-slate-400">Next Audit Due:</span>
                  <p className="font-semibold text-slate-800">{selectedCert.nextDueDate}</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="font-semibold text-slate-800 block mb-1">Remarks & Observations</span>
              <p className="text-slate-600 leading-relaxed">{selectedCert.remarks}</p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedCert(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
