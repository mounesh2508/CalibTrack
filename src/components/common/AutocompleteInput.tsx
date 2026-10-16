import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check } from 'lucide-react';

export interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  emptyCustomHint?: string;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select or type custom...',
  disabled = false,
  required = false,
  className = '',
  emptyCustomHint = 'Use custom value',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on user text
  const trimmedVal = value.trim().toLowerCase();
  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(trimmedVal)
  );

  const isExactMatch = options.some(
    (opt) => opt.toLowerCase() === trimmedVal
  );

  const showCustomOption = trimmedVal.length > 0 && !isExactMatch;

  const handleSelect = (selected: string) => {
    onChange(selected);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
              inputRef.current?.blur();
            }
          }}
          className="w-full px-3 py-2 pr-9 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (!isOpen) {
              setIsOpen(true);
              inputRef.current?.focus();
            } else {
              setIsOpen(false);
            }
          }}
          className="absolute right-0 top-0 bottom-0 px-2.5 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer disabled:cursor-not-allowed"
          aria-label="Toggle options"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </button>
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto bg-white rounded-lg shadow-xl border border-slate-200 z-50 py-1 text-xs divide-y divide-slate-100 animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Header notice */}
          <div className="px-3 py-1.5 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Suggestions</span>
            <span className="font-normal normal-case text-slate-400">Type freely for custom</span>
          </div>

          {/* Filtered suggestions list */}
          <div className="py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.toLowerCase() === value.trim().toLowerCase();
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50/60 font-semibold text-blue-700' : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-slate-400 text-[11px] italic">
                No matching standard presets
              </div>
            )}
          </div>

          {/* Custom option prompt */}
          {showCustomOption && (
            <div className="p-1 bg-slate-50/50">
              <button
                type="button"
                onClick={() => handleSelect(value.trim())}
                className="w-full px-2.5 py-1.5 text-left rounded bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center gap-2 font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">
                  {emptyCustomHint}: <strong className="font-semibold text-blue-900">"{value.trim()}"</strong>
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
