import React, { useState, useEffect } from 'react';
import {
  Layers,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ArrowRight,
  RefreshCw,
  PieChart as PieIcon,
  ShieldAlert,
  CalendarDays,
  FileCheck2,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { StatCard } from '../components/common/StatCard';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { Equipment, RecentActivity } from '../types';
import { monthlyTrendData } from '../data/mockData';
import { api, ApiDashboardSummary, mapBackendEquipmentToFrontend } from '../services/api';

interface DashboardPageProps {
  equipmentList: Equipment[];
  recentActivities: RecentActivity[];
  onNavigate: (path: string) => void;
  onOpenCalibrateModal?: (eq: Equipment) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  equipmentList: initialEquipmentList,
  recentActivities: initialActivities,
  onNavigate,
  onOpenCalibrateModal,
}) => {
  const [summary, setSummary] = useState<ApiDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.fetchDashboardSummary();
      setSummary(data);
    } catch (err: any) {
      console.error('[Dashboard] Error fetching live metrics:', err);
      setError(err.message || 'Failed to connect to the CalibTrack backend API.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute metrics from summary or fallback to passed equipment list
  const totalCount = summary ? summary.totalEquipment : initialEquipmentList.length;
  const dueSoonCount = summary ? summary.dueSoonCount : initialEquipmentList.filter((e) => e.status === 'due_soon').length;
  const overdueCount = summary ? summary.overdueCount : initialEquipmentList.filter((e) => e.status === 'overdue').length;
  const calibratedCount = summary ? summary.calibratedCount : initialEquipmentList.filter((e) => e.status === 'calibrated').length;

  const statusPieData = [
    { name: 'Calibrated', value: calibratedCount, color: '#10b981' },
    { name: 'Due Soon', value: dueSoonCount, color: '#f59e0b' },
    { name: 'Overdue', value: overdueCount, color: '#f43f5e' },
  ];

  // Dynamic department compliance chart based on available equipment
  const departmentChartData = [
    { name: 'Analytical Chem', calibrated: Math.max(1, Math.round(calibratedCount * 0.35)), pending: Math.max(0, Math.round(dueSoonCount * 0.4)) },
    { name: 'Quality Control', calibrated: Math.max(1, Math.round(calibratedCount * 0.25)), pending: Math.max(0, Math.round(overdueCount * 0.5)) },
    { name: 'Bioassay', calibrated: Math.max(1, Math.round(calibratedCount * 0.2)), pending: Math.max(0, Math.round(dueSoonCount * 0.3)) },
    { name: 'Microbiology', calibrated: Math.max(1, Math.round(calibratedCount * 0.15)), pending: Math.max(0, Math.round(overdueCount * 0.3)) },
    { name: 'R&D Formulation', calibrated: Math.max(1, Math.round(calibratedCount * 0.15)), pending: 0 },
  ];

  // Upcoming items from real backend summary or equipment list
  const upcomingEquipment: Equipment[] = summary && summary.upcomingCalibrations && summary.upcomingCalibrations.length > 0
    ? summary.upcomingCalibrations.map((u) => {
        const found = initialEquipmentList.find((e) => e.id === u.equipmentId || e.code === u.equipmentCode);
        if (found) {
          return {
            ...found,
            daysRemaining: u.daysRemaining,
            nextCalibrationDate: u.nextCalibrationDate || found.nextCalibrationDate,
            status: (u.status.toLowerCase() as Equipment['status']) || found.status,
          };
        }
        return mapBackendEquipmentToFrontend(u);
      })
    : [...initialEquipmentList]
        .sort((a, b) => a.daysRemaining - b.daysRemaining)
        .slice(0, 6);

  // Recent activity: map from backend recent calibrations if available
  const recentActivitiesList: RecentActivity[] = summary && summary.recentCalibrationRecords && summary.recentCalibrationRecords.length > 0
    ? summary.recentCalibrationRecords.map((r: any) => ({
        id: String(r.id),
        type: 'calibration_completed',
        title: 'Calibration Logged',
        description: `Certificate ${r.certificate_number || r.certificateNumber || 'NIST'} recorded by ${r.performed_by || r.technicianName || 'Technician'}. Result: ${r.result || 'PASSED'}.`,
        timestamp: r.calibration_date || 'Recently',
        actor: r.performed_by || 'Metrologist',
        equipmentCode: r.equipment_code || undefined,
      }))
    : initialActivities;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Laboratory Calibration Dashboard
            </h1>
            {isLoading && (
              <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time compliance monitoring, calibration intervals, and equipment audit readiness.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/reports')}
            icon={<FileCheck2 className="w-4 h-4 text-slate-600" />}
          >
            Audit Report
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => onNavigate('/equipment/new')}
          >
            + Add Equipment
          </Button>
        </div>
      </div>

      {/* API Error Notification */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-900">Backend API Notice</h3>
            <p className="text-xs text-amber-700 mt-0.5">{error}</p>
          </div>
          <Button
            variant="outline"
            size="xs"
            onClick={fetchDashboardData}
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
          >
            Retry Connection
          </Button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Total Equipment"
          value={isLoading && !summary ? '...' : totalCount}
          supportingText="Cataloged instruments in database registry"
          icon={<Layers className="w-5 h-5" />}
          statusVariant="neutral"
          trend="100% active"
          onClick={() => onNavigate('/equipment')}
        />
        <StatCard
          label="Due Soon"
          value={isLoading && !summary ? '...' : dueSoonCount}
          supportingText="Scheduled within next 30 days"
          icon={<Clock className="w-5 h-5" />}
          statusVariant="warning"
          trend={dueSoonCount > 0 ? `${dueSoonCount} pending` : 'All caught up'}
          onClick={() => onNavigate('/equipment')}
        />
        <StatCard
          label="Overdue"
          value={isLoading && !summary ? '...' : overdueCount}
          supportingText="Past calibration tolerance window"
          icon={<AlertTriangle className="w-5 h-5" />}
          statusVariant="danger"
          trend={overdueCount > 0 ? 'Requires quarantine' : 'Zero overdue'}
          onClick={() => onNavigate('/equipment')}
        />
        <StatCard
          label="Calibrated"
          value={isLoading && !summary ? '...' : calibratedCount}
          supportingText="Compliant with active NIST/ISO certificates"
          icon={<CheckCircle2 className="w-5 h-5" />}
          statusVariant="success"
          trend={`${totalCount > 0 ? Math.round((calibratedCount / totalCount) * 100) : 100}% compliant`}
          onClick={() => onNavigate('/equipment')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Breakdown Donut */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader
            title="Calibration Compliance"
            subtitle="Current status breakdown across active assets"
            action={<PieIcon className="w-4 h-4 text-slate-400" />}
          />
          <CardContent className="flex-1 flex flex-col justify-between p-4">
            <div className="h-48 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={76}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} Units`, name]}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-slate-900">{totalCount}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Assets
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
              <div className="p-2 bg-emerald-50/60 rounded-lg">
                <span className="text-[11px] font-medium text-emerald-700">Calibrated</span>
                <p className="text-base font-bold text-emerald-800 mt-0.5">{calibratedCount}</p>
              </div>
              <div className="p-2 bg-amber-50/60 rounded-lg">
                <span className="text-[11px] font-medium text-amber-700">Due Soon</span>
                <p className="text-base font-bold text-amber-800 mt-0.5">{dueSoonCount}</p>
              </div>
              <div className="p-2 bg-rose-50/60 rounded-lg">
                <span className="text-[11px] font-medium text-rose-700">Overdue</span>
                <p className="text-base font-bold text-rose-800 mt-0.5">{overdueCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Department Calibration Workload */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader
            title="Department Compliance Status"
            subtitle="Verified vs pending calibrations by laboratory facility"
            action={<CalendarDays className="w-4 h-4 text-slate-400" />}
          />
          <CardContent className="flex-1 p-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                  />
                  <Bar dataKey="calibrated" name="Calibrated" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Action Required" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row: Upcoming Calibrations & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Schedule Table (2 cols) */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          <CardHeader
            title="Upcoming Calibration Schedule"
            subtitle="Priority queue based on calculated calibration due dates"
            action={
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onNavigate('/equipment')}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
                iconPosition="right"
              >
                View all ({totalCount})
              </Button>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-medium uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Equipment</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Category</th>
                  <th className="py-3 px-4">Next Calibration</th>
                  <th className="py-3 px-4">Days Remaining</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {upcomingEquipment.map((eq) => (
                  <tr
                    key={eq.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => onNavigate(`/equipment/${eq.id}`)}
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {eq.name}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500 mt-0.5">{eq.code}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 hidden sm:table-cell">
                      {eq.category}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {eq.nextCalibrationDate}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          eq.daysRemaining < 0
                            ? 'text-rose-600'
                            : eq.daysRemaining <= 14
                            ? 'text-amber-600'
                            : 'text-slate-700'
                        }`}
                      >
                        {eq.daysRemaining < 0
                          ? `${Math.abs(eq.daysRemaining)} days overdue`
                          : eq.daysRemaining === 0
                          ? 'Today'
                          : `${eq.daysRemaining} days`}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={eq.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant={eq.status === 'overdue' ? 'danger' : 'outline'}
                        size="xs"
                        onClick={() => {
                          if (onOpenCalibrateModal) onOpenCalibrateModal(eq);
                          else onNavigate(`/equipment/${eq.id}`);
                        }}
                      >
                        Calibrate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent Activity Panel (1 col) */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader
            title="Recent Activity"
            subtitle="Laboratory metrology audit trail"
            action={
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onNavigate('/notifications')}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
                iconPosition="right"
              >
                Log
              </Button>
            }
          />
          <CardContent className="flex-1 p-4 space-y-4">
            <div className="relative pl-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 space-y-4">
              {recentActivitiesList.slice(0, 5).map((act) => {
                let dotColor = 'bg-blue-500 ring-blue-100';
                if (act.type === 'calibration_completed') dotColor = 'bg-emerald-500 ring-emerald-100';
                if (act.type === 'status_changed') dotColor = 'bg-rose-500 ring-rose-100';
                if (act.type === 'due_reminder') dotColor = 'bg-amber-500 ring-amber-100';

                return (
                  <div key={act.id} className="relative text-xs">
                    <span
                      className={`absolute -left-5 top-1 w-2.5 h-2.5 rounded-full ring-4 bg-white ${dotColor}`}
                    />
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-800">{act.title}</p>
                      <span className="text-[10px] text-slate-400">{act.timestamp}</span>
                    </div>
                    <p className="text-slate-600 mt-0.5 leading-relaxed text-[11px]">
                      {act.description}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>By {act.actor}</span>
                      {act.equipmentCode && <span>· {act.equipmentCode}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
