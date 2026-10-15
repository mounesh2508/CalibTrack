import React, { useState } from 'react';
import {
  FileText,
  FileCheck2,
  Clock,
  AlertTriangle,
  Download,
  Calendar,
  Building,
  CheckCircle2,
  Filter,
  Eye,
  FileSpreadsheet,
  X,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Equipment, CalibrationRecord } from '../types';
import {
  generateAndDownloadReport,
  prepareReportData,
  ReportFormat,
  PreparedReportData,
} from '../utils/reportGenerator';

interface ReportsPageProps {
  equipmentList: Equipment[];
  calibrationRecords: CalibrationRecord[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  equipmentList,
  calibrationRecords,
}) => {
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedDateRange, setSelectedDateRange] = useState('Quarter 4 (2026)');
  const [format, setFormat] = useState<ReportFormat>('PDF');
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [previewReport, setPreviewReport] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<{
    filename: string;
    format: string;
    recordCount: number;
    title: string;
  } | null>(null);

  const totalEquipment = equipmentList.length;
  const dueSoonCount = equipmentList.filter((e) => e.status === 'due_soon').length;
  const overdueCount = equipmentList.filter((e) => e.status === 'overdue').length;
  const totalCalibrations = calibrationRecords.length;

  const handleGenerate = (reportTitle: string) => {
    setGeneratingReport(reportTitle);
    setTimeout(() => {
      try {
        const result = generateAndDownloadReport({
          reportTitle,
          department: selectedDepartment,
          dateRange: selectedDateRange,
          format,
          equipmentList,
          calibrationRecords,
        });

        const extension = format === 'CSV' ? '.csv' : format === 'XLSX' ? '.xlsx' : '.pdf';
        setDownloadNotice({
          filename: `${result.filename}${extension}`,
          format,
          recordCount: result.summary.totalCount,
          title: reportTitle,
        });
      } catch (err) {
        console.error('[Reports] Error generating report:', err);
      } finally {
        setGeneratingReport(null);
      }
    }, 400);
  };

  const reportCards = [
    {
      id: 'equipment-report',
      title: 'Equipment Report',
      description: 'Comprehensive registry overview of all registered laboratory equipment, specifications, and custodian assignments.',
      stat: `${totalEquipment} Instruments`,
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      accent: 'border-l-blue-500',
    },
    {
      id: 'calibration-history',
      title: 'Calibration History',
      description: 'Complete audit log of completed calibrations, ISO 17025 certificate numbers, technician signatures, and findings.',
      stat: `${totalCalibrations} Verified Records`,
      icon: <FileCheck2 className="w-5 h-5 text-emerald-600" />,
      accent: 'border-l-emerald-500',
    },
    {
      id: 'upcoming-calibration',
      title: 'Upcoming Calibration',
      description: 'Scheduled list of instruments requiring recertification within the next 30 days to avoid testing disruptions.',
      stat: `${dueSoonCount} Due Instruments`,
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      accent: 'border-l-amber-500',
    },
    {
      id: 'overdue-equipment',
      title: 'Overdue Equipment',
      description: 'Non-conforming instruments that exceeded their tolerance window and require immediate quarantine.',
      stat: `${overdueCount} Critical Alerts`,
      icon: <AlertTriangle className="w-5 h-5 text-rose-600" />,
      accent: 'border-l-rose-500',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Compliance &amp; Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate and download laboratory compliance and equipment calibration reports directly to your device.
          </p>
        </div>
      </div>

      {/* Download Success Confirmation Banner */}
      {downloadNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-950">Report Downloaded Successfully!</span>
                <span className="bg-emerald-200/70 text-emerald-800 font-mono font-semibold px-2 py-0.2 rounded text-[10px]">
                  {downloadNotice.format}
                </span>
              </div>
              <p className="text-emerald-700 mt-0.5">
                Saved <strong className="font-mono">{downloadNotice.filename}</strong> ({downloadNotice.recordCount} records) to your device.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDownloadNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Filter className="w-3.5 h-3.5" />
          <span>Report Scope &amp; Configuration</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Department Custody
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="All">All Departments (Enterprise)</option>
              <option value="Analytical Chemistry">Analytical Chemistry</option>
              <option value="Quality Control">Quality Control</option>
              <option value="Microbiology">Microbiology</option>
              <option value="Bioassay">Bioassay</option>
              <option value="R&D Formulation">R&D Formulation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Reporting Period
            </label>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="Quarter 4 (2026)">Current Quarter (Q4 2026)</option>
              <option value="Quarter 3 (2026)">Previous Quarter (Q3 2026)</option>
              <option value="Annual 2026">Fiscal Year 2026</option>
              <option value="All Time">Full Historical Traceability</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Document Format
            </label>
            <div className="grid grid-cols-3 gap-1.5 h-9 bg-slate-100 p-0.5 rounded-lg">
              {(['PDF', 'CSV', 'XLSX'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={`text-xs font-medium rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    format === fmt
                      ? 'bg-white text-blue-700 font-bold shadow-2xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{fmt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reportCards.map((card) => {
          const isCompiling = generatingReport === card.title;

          return (
            <div
              key={card.id}
              className={`bg-white rounded-xl border border-slate-200/90 border-l-4 ${card.accent} shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      {card.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm tracking-tight">
                        {card.title}
                      </h3>
                      <span className="text-xs font-mono text-slate-500">{card.stat}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                  Format: <span className="font-bold text-slate-800">{format}</span>
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setPreviewReport(card.title)}
                    icon={<Eye className="w-3.5 h-3.5 text-slate-600" />}
                  >
                    Preview
                  </Button>
                  <Button
                    variant="primary"
                    size="xs"
                    isLoading={isCompiling}
                    disabled={isCompiling}
                    onClick={() => handleGenerate(card.title)}
                    icon={<Download className="w-3.5 h-3.5" />}
                  >
                    {isCompiling ? 'Compiling...' : `Download ${format}`}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Generated Report Preview Modal */}
      {previewReport && (() => {
        const previewData = prepareReportData({
          reportTitle: previewReport,
          department: selectedDepartment,
          dateRange: selectedDateRange,
          format,
          equipmentList,
          calibrationRecords,
        });

        return (
          <Modal
            isOpen={!!previewReport}
            onClose={() => setPreviewReport(null)}
            title={`Report Preview: ${previewReport}`}
            subtitle={`Document Format: ${format} · Scope: ${selectedDepartment} · ${selectedDateRange}`}
            maxWidth="2xl"
            footer={
              <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
                <span className="text-xs text-slate-500 font-mono">
                  ISO/IEC 17025 Traceable Dataset · {previewData.summary.totalCount} Total Entries
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPreviewReport(null)}>
                    Close
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Download className="w-3.5 h-3.5" />}
                    onClick={() => {
                      handleGenerate(previewReport);
                      setPreviewReport(null);
                    }}
                  >
                    Download {format} File
                  </Button>
                </div>
              </div>
            }
          >
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Ready for direct export. Generated file complies with ISO/IEC 17025 metrology documentation requirements.
                </span>
              </div>

              {/* Summary Metadata */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 font-semibold text-slate-800 flex justify-between">
                  <span>Export Specifications</span>
                  <span className="font-mono text-slate-500 text-[11px]">{previewData.filename}.{format.toLowerCase()}</span>
                </div>
                <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Department Scope:</span>
                    <span className="font-medium text-slate-800">{previewData.summary.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Reporting Window:</span>
                    <span className="font-medium text-slate-800">{previewData.summary.dateRange}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Format:</span>
                    <span className="font-medium text-blue-700">{format} Document</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Record Count:</span>
                    <span className="font-bold text-slate-900">{previewData.summary.totalCount} items</span>
                  </div>
                </div>
              </div>

              {/* Tabular Preview (First 5 records) */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 font-semibold text-slate-800 text-[11px] flex justify-between items-center">
                  <span>Sample Data Preview ({Math.min(5, previewData.rows.length)} of {previewData.rows.length} rows)</span>
                  <span className="text-slate-500 font-normal">Full dataset included in download</span>
                </div>
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full border-collapse text-[10px]">
                    <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 sticky top-0">
                      <tr>
                        {previewData.headers.slice(0, 6).map((h, i) => (
                          <th key={i} className="p-2 text-left font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.rows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400">
                            No records matching this department and scope.
                          </td>
                        </tr>
                      ) : (
                        previewData.rows.slice(0, 5).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50">
                            {row.slice(0, 6).map((cell, cIdx) => (
                              <td key={cIdx} className="p-2 font-mono whitespace-nowrap text-slate-700">
                                {String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};
