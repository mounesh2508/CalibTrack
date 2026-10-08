import React from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  supportingText: string;
  icon: React.ReactNode;
  trend?: string;
  statusVariant?: 'neutral' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  supportingText,
  icon,
  trend,
  statusVariant = 'neutral',
  onClick,
}) => {
  const variantStyles = {
    neutral: {
      accentBorder: 'border-l-slate-400',
      iconBg: 'bg-slate-100 text-slate-700',
      indicator: 'text-slate-500',
    },
    success: {
      accentBorder: 'border-l-emerald-500',
      iconBg: 'bg-emerald-50 text-emerald-600',
      indicator: 'text-emerald-700 bg-emerald-50/80',
    },
    warning: {
      accentBorder: 'border-l-amber-500',
      iconBg: 'bg-amber-50 text-amber-600',
      indicator: 'text-amber-700 bg-amber-50/80',
    },
    danger: {
      accentBorder: 'border-l-rose-500',
      iconBg: 'bg-rose-50 text-rose-600',
      indicator: 'text-rose-700 bg-rose-50/80',
    },
  }[statusVariant];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/90 border-l-4 ${variantStyles.accentBorder} p-5 shadow-xs transition-all duration-150 ${
        onClick ? 'hover:shadow-sm hover:border-slate-300 cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-slate-900">{value}</span>
            {trend && (
              <span className="text-xs font-medium text-slate-500">
                {trend}
              </span>
            )}
          </div>
        </div>
        <div className={`p-2.5 rounded-lg ${variantStyles.iconBg} shrink-0`}>
          {icon}
        </div>
      </div>
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>{supportingText}</span>
      </div>
    </div>
  );
};
