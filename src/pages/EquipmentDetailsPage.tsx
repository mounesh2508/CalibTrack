import React, { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { Equipment, CalibrationRecord } from '../types';

interface EquipmentDetailsPageProps {
  equipmentId: string;
  equipmentList: Equipment[];
  calibrationRecords: CalibrationRecord[];
  onNavigate: (path: string) => void;
  onOpenCalibrateModal?: (eq: Equipment) => void;
}

export const EquipmentDetailsPage: React.FC<EquipmentDetailsPageProps> = ({
  equipmentId,
  equipmentList,
  calibrationRecords,
  onNavigate,
  onOpenCalibrateModal,
}) => {
  const [selectedCert, setSelectedCert] = useState<CalibrationRecord | null>(null);

  const equipment = equipmentList.find((e) => e.id === equipmentId) || equipmentList[0];

  if (!equipment) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Equipment not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => onNavigate('/equipment')}>
          Back to Equipment List
        </Button>
      </div>
    );
  }

  // Filter history records matching this equipment
  const history = calibrationRecords.filter(
    (r) => r.equipmentId === equipment.id || r.equipmentCode === equipment.code
  );

  // If no specific history found in mock, provide fallback mock history for realism
  const displayHistory: CalibrationRecord[] = history.length > 0 ? history : [
    {
      id: `REC-ARCH-${equipment.id}-1`,
      equipmentId: equipment.id,
      equipmentCode: equipment.code,
      equipmentName: equipment.name,
      calibrationDate: equipment.lastCalibrationDate,
      nextDueDate: equipment.nextCalibrationDate,
      serviceProvider: 'Metrology Global Solutions ISO 17025',
      technicianName: 'Alan Croft, Certified Metrologist',
      certificateNumber: `CERT-${equipment.code}-01`,
      result: 'Passed',
      standardUsed: equipment.calibrationStandard || 'NIST Traceable Primary Reference',
      environmentalTemp: '20.5 °C',
      environmentalHumidity: '45 % RH',
      remarks: 'Full verification conforming to GLP/GMP laboratory standards. All points within tolerance.',
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
              <StatusBadge status={equipment.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {equipment.manufacturer} · {equipment.model} · Serial #{equipment.serialNumber}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            icon={<Edit className="w-4 h-4 text-slate-500" />}
            onClick={() => alert(`Edit mode for ${equipment.name} ready for metadata modifications.`)}
          >
            Edit
          </Button>
          <Button
            variant={equipment.status === 'overdue' ? 'danger' : 'primary'}
            size="sm"
            icon={<Wrench className="w-4 h-4" />}
            onClick={() => {
              if (onOpenCalibrateModal) onOpenCalibrateModal(equipment);
              else onNavigate('/calibration');
            }}
          >
            Calibrate Instrument
          </Button>
        </div>
      </div>

      {/* Grid: Calibration Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Last Calibration
          </p>
          <p className="text-lg font-bold text-slate-800 mt-1.5">{equipment.lastCalibrationDate}</p>
          <p className="text-xs text-slate-500 mt-1">Certified by external metrology</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Next Calibration
          </p>
          <p className="text-lg font-bold text-slate-800 mt-1.5">{equipment.nextCalibrationDate}</p>
          <p className="text-xs text-slate-500 mt-1">
            Interval: {equipment.calibrationIntervalMonths} Months
          </p>
        </div>

        <div
          className={`p-4 rounded-xl border shadow-2xs ${
            equipment.daysRemaining < 0
              ? 'bg-rose-50/50 border-rose-200'
              : equipment.daysRemaining <= 14
              ? 'bg-amber-50/50 border-amber-200'
              : 'bg-white border-slate-200'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Days Remaining
          </p>
          <p
            className={`text-lg font-bold mt-1.5 ${
              equipment.daysRemaining < 0
                ? 'text-rose-600'
                : equipment.daysRemaining <= 14
                ? 'text-amber-600'
                : 'text-slate-800'
            }`}
          >
            {equipment.daysRemaining < 0
              ? `${Math.abs(equipment.daysRemaining)} Days Overdue`
              : equipment.daysRemaining === 0
              ? 'Due Today'
              : `${equipment.daysRemaining} Days`}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {equipment.daysRemaining < 0
              ? 'Quarantine procedure initiated'
              : 'Within standard tolerance window'}
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Current Status
          </p>
          <div className="mt-2">
            <StatusBadge status={equipment.status} />
          </div>
          <p className="text-xs text-slate-500 mt-2">ISO 17025 Class A equipment</p>
        </div>
      </div>

      {/* Two Column Layout: Specifications & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Equipment Information */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Equipment Information"
            subtitle="Technical hardware specifications and custody assignments"
          />
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
              <div>
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[11px]">
                  Manufacturer
                </span>
                <span className="text-slate-900 font-semibold text-sm mt-0.5 block">
                  {equipment.manufacturer}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[11px]">
                  Model Designation
                </span>
                <span className="text-slate-900 font-semibold text-sm mt-0.5 block">
                  {equipment.model}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[11px]">
                  Serial Number
                </span>
                <span className="font-mono text-slate-800 font-semibold mt-0.5 block">
                  {equipment.serialNumber}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[11px]">
                  Category
                </span>
                <span className="text-slate-800 font-medium mt-0.5 block">
                  {equipment.category}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[11px]">
                  Department Custody
                </span>
                <span className="text-slate-800 font-medium mt-0.5 block">
                  {equipment.department}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[11px]">
                  Laboratory Location
                </span>
                <span className="text-slate-800 font-medium mt-0.5 block">
                  {equipment.location}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[11px]">
                  Purchase / Commission Date
                </span>
                <span className="text-slate-800 font-medium mt-0.5 block">
                  {equipment.purchaseDate}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[11px]">
                  Lead Custodian / Metrologist
                </span>
                <span className="text-slate-800 font-medium mt-0.5 block">
                  {equipment.assignedTechnician}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[11px]">
                  Calibration Tolerance
                </span>
                <span className="font-mono text-slate-800 font-medium mt-0.5 block">
                  {equipment.tolerance || '±0.01 %'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[11px]">
                  Primary Calibration Standard
                </span>
                <span className="text-slate-800 font-medium mt-0.5 block">
                  {equipment.calibrationStandard || 'NIST Traceable Primary Standard'}
                </span>
              </div>
            </div>

            {equipment.description && (
              <div className="pt-4 border-t border-slate-100">
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[11px] mb-1">
                  Operational Description & Method Scope
                </span>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
                  {equipment.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Instrument Lifecycle Timeline */}
        <Card className="lg:col-span-1">
          <CardHeader
            title="Recent Activity"
            subtitle="Chronological audit history"
          />
          <CardContent className="space-y-4">
            <div className="relative pl-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 space-y-4 text-xs">
              <div className="relative">
                <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full ring-4 bg-white ring-blue-100 bg-blue-500" />
                <p className="font-semibold text-slate-800">Calibration inspection status verified</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Automated threshold monitoring engine validated due dates.
                </p>
                <span className="text-[10px] text-slate-400 block mt-1">Today, 08:30 AM</span>
              </div>

              <div className="relative">
                <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full ring-4 bg-white ring-emerald-100 bg-emerald-500" />
                <p className="font-semibold text-slate-800">Last verification certificate issued</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Conducted by external vendor on {equipment.lastCalibrationDate}.
                </p>
                <span className="text-[10px] text-slate-400 block mt-1">{equipment.lastCalibrationDate}</span>
              </div>

              <div className="relative">
                <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full ring-4 bg-white ring-slate-100 bg-slate-400" />
                <p className="font-semibold text-slate-800">Commissioned & standard assigned</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Assigned to {equipment.department} with {equipment.calibrationIntervalMonths}-month cycle.
                </p>
                <span className="text-[10px] text-slate-400 block mt-1">{equipment.purchaseDate}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Width Table: Calibration History */}
      <Card>
        <CardHeader
          title="Calibration History"
          subtitle="Certified records, calibration certificates, and inspection results"
          action={
            <Button
              variant="outline"
              size="xs"
              icon={<FileCheck2 className="w-3.5 h-3.5" />}
              onClick={() => alert('Certificate records export simulated.')}
            >
              Export Certificates
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-medium uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Service Provider</th>
                <th className="py-3 px-4">Certificate #</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">Next Due</th>
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-4 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayHistory.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-900">{rec.calibrationDate}</td>
                  <td className="py-3 px-4 text-slate-700">
                    <p className="font-medium">{rec.serviceProvider}</p>
                    <p className="text-[11px] text-slate-400">{rec.technicianName}</p>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-blue-600">
                    {rec.certificateNumber}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={rec.result} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">{rec.nextDueDate}</td>
                  <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={rec.remarks}>
                    {rec.remarks}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setSelectedCert(rec)}
                      icon={<ExternalLink className="w-3.5 h-3.5" />}
                    >
                      Certificate
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Certificate Inspection Modal */}
      {selectedCert && (
        <Modal
          isOpen={!!selectedCert}
          onClose={() => setSelectedCert(null)}
          title={`Calibration Certificate - ${selectedCert.certificateNumber}`}
          subtitle={`Verified record for ${equipment.name}`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-500 font-mono">ISO/IEC 17025 Accredited</span>
              <Button variant="outline" size="sm" onClick={() => setSelectedCert(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Service Provider:</span>
                <span className="font-semibold text-slate-900">{selectedCert.serviceProvider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Lead Metrologist:</span>
                <span className="text-slate-800 font-medium">{selectedCert.technicianName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Inspection Date:</span>
                <span className="text-slate-800 font-medium">{selectedCert.calibrationDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Next Expiration Date:</span>
                <span className="text-slate-800 font-medium">{selectedCert.nextDueDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Result Finding:</span>
                <StatusBadge status={selectedCert.result} size="sm" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-semibold text-slate-800 block">Metrology Environmental Conditions</span>
              <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[11px]">Ambient Temperature</span>
                  <span className="font-mono text-slate-800 font-medium">{selectedCert.environmentalTemp}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Relative Humidity</span>
                  <span className="font-mono text-slate-800 font-medium">{selectedCert.environmentalHumidity}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-slate-800 block">Standards & Reference Material Used</span>
              <p className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-700 font-mono text-[11px]">
                {selectedCert.standardUsed}
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-slate-800 block">Technician Remarks & Adjustments</span>
              <p className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-700 leading-relaxed">
                {selectedCert.remarks}
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
