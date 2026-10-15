import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  FileText,
  ArrowRight,
  RefreshCw,
  Info,
  Check,
  Eye,
  Trash2,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Equipment } from '../../types';
import { api } from '../../services/api';
import {
  processEquipmentCsv,
  downloadSampleEquipmentCsv,
  ParsedEquipmentRow,
} from '../../utils/csvEquipmentParser';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingEquipment: Equipment[];
  onImportSuccess: (importedCount: number) => Promise<void> | void;
}

type FilterTab = 'all' | 'valid' | 'duplicate' | 'invalid';

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  existingEquipment,
  onImportSuccess,
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedEquipmentRow[]>([]);
  const [validCount, setValidCount] = useState<number>(0);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Result state
  const [importResult, setImportResult] = useState<{
    totalProcessed: number;
    importedCount: number;
    skippedCount: number;
    skippedItems: Array<{ equipment_code: string; name: string; reason: string }>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const resetState = () => {
    setStep('upload');
    setFileName('');
    setFileSize('');
    setParsedRows([]);
    setValidCount(0);
    setDuplicateCount(0);
    setErrorCount(0);
    setActiveTab('all');
    setIsSubmitting(false);
    setSubmitError(null);
    setImportResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFile = (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      setSubmitError('Please upload a valid .csv file format.');
      return;
    }

    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);
    setSubmitError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text || text.trim().length === 0) {
        setSubmitError('The selected CSV file is empty.');
        return;
      }

      const result = processEquipmentCsv(text, existingEquipment);
      if (result.rows.length === 0) {
        setSubmitError('Could not find data rows in the CSV. Please check the file formatting or use our sample template.');
        return;
      }

      setParsedRows(result.rows);
      setValidCount(result.validCount);
      setDuplicateCount(result.duplicateCount);
      setErrorCount(result.errorCount);
      setStep('preview');
    };

    reader.onerror = () => {
      setSubmitError('Failed to read the file. Please try again.');
    };

    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  // Filtered rows for the preview table
  const displayedRows = parsedRows.filter((r) => {
    if (activeTab === 'valid') return r.status === 'VALID';
    if (activeTab === 'duplicate') return r.status === 'DUPLICATE';
    if (activeTab === 'invalid') return r.status === 'INVALID';
    return true;
  });

  // Execute bulk import on the server
  const handleCommitImport = async () => {
    const validRows = parsedRows.filter((r) => r.status === 'VALID');
    if (validRows.length === 0) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payloadItems = validRows.map((r) => ({
        equipment_code: r.equipment_code,
        name: r.name,
        category: r.category,
        manufacturer: r.manufacturer,
        model_number: r.model_number,
        serial_number: r.serial_number,
        location: r.location,
        department: r.department,
        purchase_date: r.purchase_date,
        calibration_interval_days: r.calibration_interval_days,
        last_calibration_date: r.last_calibration_date || undefined,
        description: r.description || undefined,
        assigned_technician: r.assigned_technician || undefined,
      }));

      const res = await api.bulkImportEquipment(payloadItems);

      // Merge client-side detected duplicates with server response for complete audit
      const clientSkipped = parsedRows
        .filter((r) => r.status === 'DUPLICATE' || r.status === 'INVALID')
        .map((r) => ({
          equipment_code: r.equipment_code || `Row ${r.rowNumber}`,
          name: r.name || 'Unnamed',
          reason: r.duplicateReason || r.errors.join('; '),
        }));

      const totalSkipped = [...clientSkipped, ...res.skippedItems];
      // Deduplicate skipped list
      const uniqueSkipped: Array<{ equipment_code: string; name: string; reason: string }> = [];
      const seen = new Set<string>();
      for (const item of totalSkipped) {
        const key = `${item.equipment_code}_${item.reason}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueSkipped.push(item);
        }
      }

      setImportResult({
        totalProcessed: parsedRows.length,
        importedCount: res.importedCount,
        skippedCount: parsedRows.length - res.importedCount,
        skippedItems: uniqueSkipped,
      });

      setStep('result');
      if (onImportSuccess) {
        await onImportSuccess(res.importedCount);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to complete bulk import. Please check connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download audit report of skipped items
  const handleDownloadSkippedReport = () => {
    if (!importResult || importResult.skippedItems.length === 0) return;
    const lines = [
      'Equipment Code,Name,Skip / Rejection Reason',
      ...importResult.skippedItems.map(
        (i) => `"${i.equipment_code.replace(/"/g, '""')}","${i.name.replace(/"/g, '""')}","${i.reason.replace(/"/g, '""')}"`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `equipment_import_skip_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  Bulk CSV Equipment Import
                </h2>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                  ISO/IEC 17025
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Bulk upload laboratory instrumentation with duplicate prevention and validation preview.
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {submitError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Import Notice</p>
                <p className="mt-0.5 text-rose-700">{submitError}</p>
              </div>
              <button
                onClick={() => setSubmitError(null)}
                className="text-rose-400 hover:text-rose-700 text-sm font-bold"
              >
                ×
              </button>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Template Download Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 text-blue-600 shadow-xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">
                      Standard Laboratory Equipment Template
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pre-formatted with metrology columns, accepted categories, intervals, and realistic sample instruments.
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadSampleEquipmentCsv}
                  icon={<Download className="w-3.5 h-3.5 text-blue-600" />}
                  className="shrink-0"
                >
                  Download Sample CSV
                </Button>
              </div>

              {/* Drag and drop upload zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                    : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".csv,text/csv,application/vnd.ms-excel"
                  className="hidden"
                />

                <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Select or drag & drop CSV file here
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Supports comma-separated files (.csv) up to 5 MB with column headers.
                </p>

                <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                  <span>Browse Device Files</span>
                </div>
              </div>

              {/* Standard Headers Reference */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Recognized Column Schema
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                  <div>
                    <span className="font-mono text-slate-900 font-semibold">equipment_code</span>
                    <span className="text-rose-500 ml-1">*Required</span>
                  </div>
                  <div>
                    <span className="font-mono text-slate-900 font-semibold">name</span>
                    <span className="text-rose-500 ml-1">*Required</span>
                  </div>
                  <div>
                    <span className="font-mono text-slate-900 font-semibold">category</span>
                    <span className="text-rose-500 ml-1">*Required</span>
                  </div>
                  <div>
                    <span className="font-mono text-slate-900 font-semibold">calibration_interval_months</span>
                    <span className="text-slate-400 ml-1">(or days)</span>
                  </div>
                  <div>
                    <span className="font-mono text-slate-900">manufacturer</span>
                    <span className="text-slate-400 ml-1">Optional</span>
                  </div>
                  <div>
                    <span className="font-mono text-slate-900">model</span>
                    <span className="text-slate-400 ml-1">Optional</span>
                  </div>
                  <div>
                    <span className="font-mono text-slate-900">serial_number</span>
                    <span className="text-slate-400 ml-1">Optional</span>
                  </div>
                  <div>
                    <span className="font-mono text-slate-900">department</span>
                    <span className="text-slate-400 ml-1">Optional</span>
                  </div>
                  <div>
                    <span className="font-mono text-slate-900">location</span>
                    <span className="text-slate-400 ml-1">Optional</span>
                  </div>
                  <div>
                    <span className="font-mono text-slate-900">purchase_date</span>
                    <span className="text-slate-400 ml-1">YYYY-MM-DD</span>
                  </div>
                  <div>
                    <span className="font-mono text-slate-900">last_calibration_date</span>
                    <span className="text-slate-400 ml-1">YYYY-MM-DD</span>
                  </div>
                  <div>
                    <span className="font-mono text-slate-900">assigned_technician</span>
                    <span className="text-slate-400 ml-1">Optional</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & VALIDATION */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* File Info & Stats Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-slate-600 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-slate-900">{fileName}</span>
                    <span className="text-[11px] text-slate-500 ml-2 font-mono">{fileSize}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span>Total: {parsedRows.length}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Valid: {validCount}</span>
                  </div>
                  {duplicateCount > 0 && (
                    <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>Duplicates: {duplicateCount}</span>
                    </div>
                  )}
                  {errorCount > 0 && (
                    <div className="flex items-center gap-1.5 text-rose-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span>Errors: {errorCount}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Compliance Guidance Notice */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  <strong>ISO 17025 Metrology Rule:</strong> Duplicate equipment codes and serial numbers will be skipped automatically to safeguard existing calibration certificate records and traceability.
                </p>
              </div>

              {/* Segmented Filter Control */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Rows ({parsedRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('valid')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'valid'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ready to Import ({validCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('duplicate')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'duplicate'
                      ? 'bg-white text-amber-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Duplicates to Skip ({duplicateCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('invalid')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'invalid'
                      ? 'bg-white text-rose-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Errors ({errorCount})
                </button>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="py-2 px-3 w-12 text-center">Row</th>
                        <th className="py-2 px-3">Code</th>
                        <th className="py-2 px-3">Equipment Name</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Serial #</th>
                        <th className="py-2 px-3">Interval</th>
                        <th className="py-2 px-3">Status / Validation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No rows match the selected filter tab.
                          </td>
                        </tr>
                      ) : (
                        displayedRows.map((r) => (
                          <tr
                            key={r.rowNumber}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              r.status === 'DUPLICATE'
                                ? 'bg-amber-50/30'
                                : r.status === 'INVALID'
                                ? 'bg-rose-50/30'
                                : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono text-center text-slate-400">
                              {r.rowNumber}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              {r.equipment_code || <span className="text-rose-500 italic">Empty</span>}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-900 max-w-[180px] truncate">
                              {r.name || <span className="text-rose-500 italic">Missing name</span>}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{r.category}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {r.serial_number}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {r.calibration_interval_months} mo
                            </td>
                            <td className="py-2.5 px-3">
                              {r.status === 'VALID' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Ready to import</span>
                                </span>
                              )}
                              {r.status === 'DUPLICATE' && (
                                <div className="text-[11px] text-amber-800">
                                  <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                    <span>Duplicate (will skip)</span>
                                  </span>
                                  <p className="text-[10px] text-amber-600 mt-0.5 truncate max-w-xs">
                                    {r.duplicateReason}
                                  </p>
                                </div>
                              )}
                              {r.status === 'INVALID' && (
                                <div className="text-[11px] text-rose-800">
                                  <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Validation error</span>
                                  </span>
                                  <ul className="text-[10px] text-rose-600 list-disc list-inside mt-0.5">
                                    {r.errors.map((err, eIdx) => (
                                      <li key={eIdx}>{err}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: RESULT SUMMARY */}
          {step === 'result' && importResult && (
            <div className="space-y-5 text-center py-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
                <Check className="w-7 h-7 stroke-[2.5]" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Bulk Equipment Import Completed
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  New laboratory instrumentation has been committed to the registry and synchronized with calibration schedules.
                </p>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-left">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                    Total Processed
                  </p>
                  <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {importResult.totalProcessed}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                  <p className="text-[11px] uppercase tracking-wider text-emerald-700 font-semibold">
                    Imported
                  </p>
                  <p className="text-xl font-bold font-mono text-emerald-800 mt-1">
                    {importResult.importedCount}
                  </p>
                </div>
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                  <p className="text-[11px] uppercase tracking-wider text-amber-700 font-semibold">
                    Skipped
                  </p>
                  <p className="text-xl font-bold font-mono text-amber-800 mt-1">
                    {importResult.skippedCount}
                  </p>
                </div>
              </div>

              {/* Skipped Items Accordion / Details */}
              {importResult.skippedItems.length > 0 && (
                <div className="text-left max-w-xl mx-auto border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <h4 className="text-xs font-semibold text-slate-900">
                        Skipped Duplicate / Invalid Items ({importResult.skippedItems.length})
                      </h4>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadSkippedReport}
                      icon={<Download className="w-3.5 h-3.5" />}
                    >
                      Export Skip Report
                    </Button>
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-200/80 border border-slate-200 rounded-lg bg-white">
                    {importResult.skippedItems.map((item, idx) => (
                      <div key={idx} className="p-2.5 text-xs flex items-start justify-between gap-3">
                        <div>
                          <span className="font-mono font-semibold text-slate-900">
                            {item.equipment_code}
                          </span>
                          <span className="text-slate-500 ml-2">({item.name})</span>
                          <p className="text-[11px] text-amber-700 mt-0.5">{item.reason}</p>
                        </div>
                        <span className="text-[10px] text-amber-600 uppercase font-mono px-2 py-0.5 bg-amber-50 rounded border border-amber-200 shrink-0">
                          Skipped
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          {step === 'upload' && (
            <div className="flex items-center justify-between w-full">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                icon={<Upload className="w-4 h-4" />}
              >
                Choose CSV File
              </Button>
            </div>
          )}

          {step === 'preview' && (
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('upload')}
                disabled={isSubmitting}
              >
                Choose Different File
              </Button>

              <div className="flex items-center gap-2.5">
                <Button variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCommitImport}
                  disabled={validCount === 0 || isSubmitting}
                  icon={
                    isSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )
                  }
                >
                  {isSubmitting
                    ? 'Importing Equipment...'
                    : `Import ${validCount} Valid Record${validCount === 1 ? '' : 's'}`}
                </Button>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="flex items-center justify-end w-full">
              <Button variant="primary" size="sm" onClick={handleClose}>
                Done & View Equipment Registry
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
