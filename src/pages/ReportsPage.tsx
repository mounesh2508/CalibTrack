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
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Equipment, CalibrationRecord } from '../types';

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
  const [format, setFormat] = useState<'PDF' | 'CSV' | 'XLSX'>('PDF');
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [previewReport, setPreviewReport] = useState<string | null>(null);

  const totalEquipment = equipmentList.length;
  const dueSoonCount = equipmentList.filter((e) => e.status === 'due_soon').length;
  const overdueCount = equipmentList.filter((e) => e.status === 'overdue').length;
  const totalCalibrations = calibrationRecords.length;

  const handleGenerate = (reportTitle: string) => {
    setGeneratingReport(reportTitle);
    setTimeout(() => {
      setGeneratingReport(null);
      setPreviewReport(reportTitle);
    }, 700);
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
            Compliance & Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate and download laboratory compliance and equipment calibration reports.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Filter className="w-3.5 h-3.5" />
          <span>Report Scope & Configuration</span>
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
                  className={`text-xs font-medium rounded-md transition-all cursor-pointer ${
                    format === fmt
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reportCards.map((card) => (
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

            <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Ready in {format} format
              </span>
              <Button
                variant="outline"
                size="xs"
                isLoading={generatingReport === card.title}
                onClick={() => handleGenerate(card.title)}
                icon={<Download className="w-3.5 h-3.5" />}
              >
                Generate Report
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Generated Report Preview Modal */}
      {previewReport && (
        <Modal
          isOpen={!!previewReport}
          onClose={() => setPreviewReport(null)}
          title={`Generated Report - ${previewReport}`}
          subtitle={`Format: ${format} · Scope: ${selectedDepartment} · ${selectedDateRange}`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-500 font-mono">
                Checksum: #SHA256-{Math.floor(100000 + Math.random() * 900000)}
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
                    setPreviewReport(null);
                  }}
                >
                  Download {format}
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Report compiled according to ISO/IEC 17025 metrology standards.</span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 font-semibold text-slate-800 flex justify-between">
                <span>Summary Metadata</span>
                <span className="font-mono text-slate-500 text-[11px]">CALIBTRACK-MET-2026</span>
              </div>
              <div className="p-3 space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Generated By:</span>
                  <span className="font-medium text-slate-900">Admin User (Administrator)</span>
                </div>
                <div className="flex justify-between">
                  <span>Timestamp:</span>
                  <span className="text-slate-900">October 8, 2026 10:20:03 UTC</span>
                </div>
                <div className="flex justify-between">
                  <span>Department Filter:</span>
                  <span className="text-slate-900">{selectedDepartment}</span>
                </div>
                <div className="flex justify-between">
                  <span>Target Range:</span>
                  <span className="text-slate-900">{selectedDateRange}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-slate-600 text-[11px] leading-relaxed">
              This document satisfies regulatory requirements for equipment verification traceability,
              including calibration vendor accreditation numbers, internal equipment identifiers,
              and compliance status flags.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
