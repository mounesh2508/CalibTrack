import React from 'react';

interface FormFieldProps {
  label: string;
  id?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  id,
  required,
  error,
  helperText,
  children,
  className = '',
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }> = ({
  className = '',
  error,
  ...props
}) => {
  return (
    <input
      className={`w-full h-10 px-3.5 py-2 text-sm bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors shadow-2xs ${
        error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-300 hover:border-slate-400'
      } ${className}`}
      {...props}
    />
  );
};

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }> = ({
  className = '',
  error,
  children,
  ...props
}) => {
  return (
    <select
      className={`w-full h-10 px-3.5 py-2 text-sm bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors shadow-2xs cursor-pointer ${
        error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-300 hover:border-slate-400'
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }> = ({
  className = '',
  error,
  ...props
}) => {
  return (
    <textarea
      className={`w-full p-3 text-sm bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors shadow-2xs ${
        error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-300 hover:border-slate-400'
      } ${className}`}
      {...props}
    />
  );
};
