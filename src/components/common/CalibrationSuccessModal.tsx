import React, { useEffect } from 'react';
import { CheckCircle2, ArrowRight, Calendar, Award, Building2, ShieldCheck, FileCheck, X } from 'lucide-react';
import { CalibrationRecord, Equipment } from '../../types';
import { Button } from './Button';
import { StatusBadge } from './StatusBadge';

export interface CalibrationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  record: CalibrationRecord | null;
  equipment?: Equipment | null;
  title?: string;
  proceedButtonText?: string;
}

export const CalibrationSuccessModal: React.FC<CalibrationSuccessModalProps> = ({
  isOpen,
  onClose,
  onProceed,
  record,
  equipment,
  title = 'Calibration Logged Successfully',
  proceedButtonText = 'Proceed to Calibration Page',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  const equipmentName = (equipment?.name && equipment.name !== 'Laboratory Instrument')
    ? equipment.name
    : (record.equipmentName && record.equipmentName !== 'Laboratory Instrument')
    ? record.equipmentName
    : 'Laboratory Instrument';

  const equipmentCode = (equipment?.code && equipment.code !== 'EQ-LOGGED' && equipment.code !== 'EQ-LOG')
    ? equipment.code
    : (record.equipmentCode && record.equipmentCode !== 'EQ-LOGGED' && record.equipmentCode !== 'EQ-LOG')
    ? record.equipmentCode
    : 'EQ-LOG';

  const department = equipment?.department;
  const location = equipment?.location;
  const manufacturer = equipment?.manufacturer;
  const model = equipment?.model;
  const serialNumber = equipment?.serialNumber;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all z-10 animate-in zoom-in-95 duration-200"
      >
        {/* Header with success banner */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white relative">
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-white/25 text-white mb-1">
                <ShieldCheck className="w-3 h-3" />
                Verified & Recorded
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white leading-snug">
                {title}
              </h2>
            </div>
          </div>
          <p className="text-xs text-emerald-50 mt-2 font-normal leading-relaxed">
            The calibration log has been securely appended to the laboratory compliance audit trail and equipment status updated.
          </p>
        </div>

        {/* Instrument & Calibration Details Content */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[calc(80vh-140px)] overflow-y-auto">
          {/* Instrument Summary Card */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 block mb-0.5">
                  Target Instrument
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  {equipmentName}
                </h3>
                {(manufacturer || model) && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {[manufacturer, model ? `Model ${model}` : null, serialNumber ? `S/N: ${serialNumber}` : null].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-700 shadow-xs shrink-0">
                {equipmentCode}
              </span>
            </div>

            {(department || location) && (
              <div className="flex items-center gap-4 text-xs text-slate-600 pt-2 border-t border-slate-200/60">
                {department && (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{department}</span>
                  </div>
                )}
                {location && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span>•</span>
                    <span>{location}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Key Audit Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-[11px] text-slate-400 font-medium block">Calibration Outcome</span>
              <div className="mt-1">
                <StatusBadge status={record.result} size="sm" />
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-[11px] text-slate-400 font-medium block">Certificate / Log #</span>
              <div className="mt-1 font-mono font-medium text-slate-800 truncate" title={record.certificateNumber}>
                {record.certificateNumber || 'N/A'}
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-[11px] text-slate-400 font-medium block">Verified Date</span>
              <div className="mt-1 font-medium text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {record.calibrationDate}
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-[11px] text-slate-400 font-medium block">Next Calibration Due</span>
              <div className="mt-1 font-semibold text-emerald-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                {record.nextDueDate}
              </div>
            </div>
          </div>

          {/* Provider & Technician */}
          <div className="p-3 bg-slate-50/60 border border-slate-200 rounded-lg text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Accredited Provider:</span>
              <span className="font-medium text-slate-700 truncate max-w-[240px]">{record.serviceProvider}</span>
            </div>
            {record.technicianName && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Metrologist / Lead:</span>
                <span className="font-medium text-slate-700">{record.technicianName}</span>
              </div>
            )}
            {record.remarks && (
              <div className="pt-2 mt-2 border-t border-slate-200 text-slate-600 italic">
                "{record.remarks}"
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onProceed}
            icon={<ArrowRight className="w-4 h-4" />}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-white"
          >
            {proceedButtonText}
          </Button>
        </div>
      </div>
    </div>
  );
};
