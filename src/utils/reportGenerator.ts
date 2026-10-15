import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Equipment, CalibrationRecord } from '../types';

export type ReportFormat = 'PDF' | 'CSV' | 'XLSX';

export interface ReportConfig {
  reportTitle: string;
  department: string;
  dateRange: string;
  format: ReportFormat;
  equipmentList: Equipment[];
  calibrationRecords: CalibrationRecord[];
}

export interface PreparedReportData {
  filename: string;
  title: string;
  sheetName: string;
  headers: string[];
  rows: (string | number)[][];
  summary: {
    totalCount: number;
    department: string;
    dateRange: string;
    generatedAt: string;
  };
}

/**
 * Filter equipment list by department
 */
export function filterEquipment(equipmentList: Equipment[], department: string): Equipment[] {
  if (department === 'All') return equipmentList;
  return equipmentList.filter((eq) => eq.department.toLowerCase() === department.toLowerCase());
}

/**
 * Filter calibration records by department
 */
export function filterCalibrations(
  records: CalibrationRecord[],
  equipmentList: Equipment[],
  department: string
): CalibrationRecord[] {
  if (department === 'All') return records;
  const validIds = new Set(
    equipmentList
      .filter((eq) => eq.department.toLowerCase() === department.toLowerCase())
      .map((e) => e.id)
  );
  const validCodes = new Set(
    equipmentList
      .filter((eq) => eq.department.toLowerCase() === department.toLowerCase())
      .map((e) => e.code)
  );

  return records.filter((r) => validIds.has(r.equipmentId) || validCodes.has(r.equipmentCode));
}

/**
 * Prepares dataset arrays and headers based on report type
 */
export function prepareReportData(config: ReportConfig): PreparedReportData {
  const { reportTitle, department, dateRange, equipmentList, calibrationRecords } = config;
  const filteredEq = filterEquipment(equipmentList, department);
  const filteredCalibs = filterCalibrations(calibrationRecords, equipmentList, department);
  const dateStamp = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const baseTitle = reportTitle.toLowerCase();

  if (baseTitle.includes('equipment') && !baseTitle.includes('overdue')) {
    // 1. Equipment Report
    const headers = [
      'Asset Code',
      'Instrument Name',
      'Category',
      'Manufacturer',
      'Model Number',
      'Serial Number',
      'Department',
      'Location',
      'Interval (Mo)',
      'Next Due Date',
      'Status',
    ];
    const rows = filteredEq.map((eq) => [
      eq.code,
      eq.name,
      eq.category,
      eq.manufacturer,
      eq.model,
      eq.serialNumber || 'N/A',
      eq.department,
      eq.location,
      eq.calibrationIntervalMonths,
      eq.nextCalibrationDate,
      eq.status.toUpperCase(),
    ]);

    return {
      filename: `CalibTrack_Equipment_Registry_${department.replace(/\s+/g, '_')}_${dateStamp}`,
      title: 'Laboratory Equipment Master Registry Report',
      sheetName: 'Equipment Registry',
      headers,
      rows,
      summary: {
        totalCount: rows.length,
        department,
        dateRange,
        generatedAt: timestamp,
      },
    };
  }

  if (baseTitle.includes('history')) {
    // 2. Calibration History Report
    const headers = [
      'Certificate #',
      'Asset Code',
      'Instrument Name',
      'Verification Date',
      'Next Due Date',
      'Metrologist / Provider',
      'Reference Standard',
      'Result',
      'Environment',
      'Remarks',
    ];
    const rows = filteredCalibs.map((rec) => [
      rec.certificateNumber,
      rec.equipmentCode,
      rec.equipmentName,
      rec.calibrationDate,
      rec.nextDueDate,
      rec.technicianName || rec.serviceProvider,
      rec.standardUsed,
      rec.result.toUpperCase(),
      `${rec.environmentalTemp} | ${rec.environmentalHumidity}`,
      rec.remarks,
    ]);

    return {
      filename: `CalibTrack_Calibration_History_${department.replace(/\s+/g, '_')}_${dateStamp}`,
      title: 'Calibration Verification History & Audit Trail',
      sheetName: 'Calibration History',
      headers,
      rows,
      summary: {
        totalCount: rows.length,
        department,
        dateRange,
        generatedAt: timestamp,
      },
    };
  }

  if (baseTitle.includes('upcoming')) {
    // 3. Upcoming Calibration Report (Due Soon)
    const dueSoon = filteredEq
      .filter((eq) => eq.status === 'due_soon' || (eq.daysRemaining >= 0 && eq.daysRemaining <= 30))
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    const headers = [
      'Asset Code',
      'Instrument Name',
      'Department',
      'Location',
      'Next Calibration Date',
      'Days Remaining',
      'Calibration Cycle',
      'Status',
    ];
    const rows = dueSoon.map((eq) => [
      eq.code,
      eq.name,
      eq.department,
      eq.location,
      eq.nextCalibrationDate,
      `${eq.daysRemaining} days`,
      `Every ${eq.calibrationIntervalMonths} Months`,
      'DUE SOON',
    ]);

    return {
      filename: `CalibTrack_Upcoming_Calibrations_${department.replace(/\s+/g, '_')}_${dateStamp}`,
      title: 'Upcoming Calibrations & Recertification Schedule',
      sheetName: 'Upcoming Calibrations',
      headers,
      rows,
      summary: {
        totalCount: rows.length,
        department,
        dateRange,
        generatedAt: timestamp,
      },
    };
  }

  // 4. Overdue Equipment Report (Quarantine)
  const overdue = filteredEq
    .filter((eq) => eq.status === 'overdue' || eq.daysRemaining < 0)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const headers = [
    'Asset Code',
    'Instrument Name',
    'Department',
    'Location',
    'Expired Due Date',
    'Days Overdue',
    'Tolerance Window',
    'Quarantine Action',
  ];
  const rows = overdue.map((eq) => [
    eq.code,
    eq.name,
    eq.department,
    eq.location,
    eq.nextCalibrationDate,
    `${Math.abs(eq.daysRemaining)} days overdue`,
    'EXCEEDED',
    'IMMEDIATE QUARANTINE / RE-CALIBRATE',
  ]);

  return {
    filename: `CalibTrack_Overdue_Quarantine_Report_${department.replace(/\s+/g, '_')}_${dateStamp}`,
    title: 'Overdue Calibration & Non-Conformance Quarantine Report',
    sheetName: 'Overdue Instruments',
    headers,
    rows,
    summary: {
      totalCount: rows.length,
      department,
      dateRange,
      generatedAt: timestamp,
    },
  };
}

/**
 * Downloads data as formatted CSV with UTF-8 BOM
 */
export function downloadCsv(data: PreparedReportData): void {
  const { filename, title, summary, headers, rows } = data;

  // Metadata comments block
  const metaLines = [
    `# CalibTrack Laboratory Metrology Services`,
    `# Report Title: ${title}`,
    `# Scope Department: ${summary.department}`,
    `# Reporting Period: ${summary.dateRange}`,
    `# Exported At: ${summary.generatedAt}`,
    `# Total Records: ${summary.totalCount}`,
    `# Standard: ISO/IEC 17025 Accredited Compliance`,
    '',
  ];

  // CSV escape helper
  const escapeCell = (cell: string | number) => {
    const val = String(cell ?? '');
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((r) => r.map(escapeCell).join(','));

  const csvContent = '\uFEFF' + [...metaLines, headerLine, ...rowLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerBrowserDownload(blob, `${filename}.csv`);
}

/**
 * Downloads data as native Excel XLSX workbook
 */
export function downloadXlsx(data: PreparedReportData): void {
  const { filename, sheetName, headers, rows } = data;

  const workbook = XLSX.utils.book_new();

  // Combine headers and rows
  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths based on contents
  const colWidths = headers.map((col, idx) => {
    const maxLen = Math.max(
      col.length,
      ...rows.map((row) => String(row[idx] ?? '').length)
    );
    return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
  });
  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Downloads data as ISO/IEC 17025 metrology formatted PDF document
 */
export function downloadPdf(data: PreparedReportData): void {
  const { filename, title, summary, headers, rows } = data;

  // Create landscape PDF for tables with many columns
  const orientation = headers.length > 7 ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36; // 0.5 inch

  // 1. Top Clinical Metrology Brand Header
  doc.setFillColor(15, 23, 42); // Deep lab slate #0F172A
  doc.rect(0, 0, pageWidth, 54, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CALIBTRACK METROLOGY SERVICES', margin, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text('ISO/IEC 17025 ACCREDITED LABORATORY CALIBRATION REGISTRY', margin, 42);

  // Status Badge on Right Header
  doc.setFontSize(8);
  doc.setTextColor(59, 130, 246);
  doc.text('VERIFIED AUDIT REPORT', pageWidth - margin - 100, 32);

  // 2. Report Title & Metadata Box
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(title, margin, 78);

  // Metadata Subtext
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate 500
  const metaText = `Department: ${summary.department}   |   Period: ${summary.dateRange}   |   Total Instruments/Records: ${summary.totalCount}   |   Exported: ${summary.generatedAt}`;
  doc.text(metaText, margin, 94);

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(margin, 102, pageWidth - margin, 102);

  // 3. AutoTable Data
  autoTable(doc, {
    startY: 112,
    head: [headers],
    body: rows.map((r) => r.map((c) => String(c ?? ''))),
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 5,
      overflow: 'linebreak',
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate 50
    },
    margin: { left: margin, right: margin, bottom: 45 },
    didDrawPage: (hookData) => {
      // Footer on every page
      const pageNumber = hookData.pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text(
        `CalibTrack Metrology Compliance · ISO/IEC 17025 Standard Operating Traceability`,
        margin,
        pageHeight - 20
      );
      doc.text(
        `Page ${pageNumber}`,
        pageWidth - margin - 35,
        pageHeight - 20
      );
    },
  });

  doc.save(`${filename}.pdf`);
}

/**
 * Universal dispatcher: generates and triggers download for selected format
 */
export function generateAndDownloadReport(config: ReportConfig): PreparedReportData {
  const preparedData = prepareReportData(config);

  if (config.format === 'CSV') {
    downloadCsv(preparedData);
  } else if (config.format === 'XLSX') {
    downloadXlsx(preparedData);
  } else {
    downloadPdf(preparedData);
  }

  return preparedData;
}

/**
 * Native trigger for browser file download
 */
function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 200);
}
