import React from 'react';

interface LoadingStateProps {
  rows?: number;
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  rows = 5,
  message = 'Loading laboratory records...',
}) => {
  return (
    <div className="p-6 bg-white rounded-xl border border-slate-200/90 space-y-4 animate-pulse">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
        <div className="h-8 bg-slate-200 rounded w-24"></div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 py-2">
            <div className="h-4 bg-slate-200 rounded w-1/6"></div>
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/6"></div>
            <div className="h-4 bg-slate-200 rounded w-1/6"></div>
            <div className="h-4 bg-slate-200 rounded w-1/12 ml-auto"></div>
          </div>
        ))}
      </div>
      <p className="text-xs text-center text-slate-400 pt-2">{message}</p>
    </div>
  );
};
