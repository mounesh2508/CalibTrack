import React from 'react';
import { EquipmentStatus, CalibrationResult } from '../../types';

interface StatusBadgeProps {
  status: EquipmentStatus | CalibrationResult | string;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  size = 'md',
}) => {
  const normalized = status.toLowerCase().replace(/\s+/g, '_');

  let dotColor = 'bg-slate-400';
  let textColor = 'text-slate-700';
  let bgColor = 'bg-slate-50 border-slate-200';
  let label = status;

  if (normalized === 'calibrated' || normalized === 'passed') {
    dotColor = 'bg-emerald-500';
    textColor = 'text-emerald-700';
    bgColor = 'bg-emerald-50/70 border-emerald-200/60';
    label = normalized === 'passed' ? 'Passed' : 'Calibrated';
  } else if (normalized === 'due_soon' || normalized === 'passed_with_adjustment') {
    dotColor = 'bg-amber-500';
    textColor = 'text-amber-700';
    bgColor = 'bg-amber-50/70 border-amber-200/60';
    label = normalized === 'due_soon' ? 'Due Soon' : 'Passed w/ Adj.';
  } else if (normalized === 'overdue' || normalized === 'failed') {
    dotColor = 'bg-rose-500';
    textColor = 'text-rose-700';
    bgColor = 'bg-rose-50/70 border-rose-200/60';
    label = normalized === 'overdue' ? 'Overdue' : 'Failed';
  } else if (normalized === 'maintenance' || normalized === 'in_progress') {
    dotColor = 'bg-blue-500';
    textColor = 'text-blue-700';
    bgColor = 'bg-blue-50/70 border-blue-200/60';
    label = normalized === 'maintenance' ? 'Maintenance' : 'In Progress';
  } else if (normalized === 'out_of_service' || normalized === 'limited_use') {
    dotColor = 'bg-slate-500';
    textColor = 'text-slate-700';
    bgColor = 'bg-slate-100 border-slate-200';
    label = normalized === 'limited_use' ? 'Limited Use' : 'Out of Service';
  } else if (normalized === 'completed') {
    dotColor = 'bg-emerald-500';
    textColor = 'text-emerald-700';
    bgColor = 'bg-emerald-50/70 border-emerald-200/60';
    label = 'Completed';
  } else if (normalized === 'scheduled') {
    dotColor = 'bg-sky-500';
    textColor = 'text-sky-700';
    bgColor = 'bg-sky-50/70 border-sky-200/60';
    label = 'Scheduled';
  }

  const sizeClasses = size === 'sm' ? 'text-[11px] py-0.5 px-2 gap-1.5' : 'text-xs py-1 px-2.5 gap-2';

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-md ${sizeClasses} ${bgColor} ${textColor} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{label}</span>
    </span>
  );
};
