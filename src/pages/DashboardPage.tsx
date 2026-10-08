import React from 'react';
import {
  Layers,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ArrowRight,
  TrendingUp,
  PieChart as PieIcon,
  ShieldAlert,
  CalendarDays,
  FileCheck2,
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

interface DashboardPageProps {
  equipmentList: Equipment[];
  recentActivities: RecentActivity[];
  onNavigate: (path: string) => void;
  onOpenCalibrateModal?: (eq: Equipment) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  equipmentList,
  recentActivities,
  onNavigate,
  onOpenCalibrateModal,
}) => {
  const totalCount = equipmentList.length;
  const dueSoonCount = equipmentList.filter((e) => e.status === 'due_soon').length;
  const overdueCount = equipmentList.filter((e) => e.status === 'overdue').length;
  const calibratedCount = equipmentList.filter((e) => e.status === 'calibrated').length;

  const statusPieData = [
    { name: 'Calibrated', value: calibratedCount, color: '#10b981' },
    { name: 'Due Soon', value: dueSoonCount, color: '#f59e0b' },
    { name: 'Overdue', value: overdueCount, color: '#f43f5e' },
  ];

  // Pick top upcoming / priority equipment
  const upcomingEquipment = [...equipmentList]
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Good morning, Admin
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor calibration status and laboratory equipment compliance.
          </p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Total Equipment"
          value={totalCount}
          supportingText="Cataloged across 5 laboratory departments"
          icon={<Layers className="w-5 h-5" />}
          statusVariant="neutral"
          trend="100% indexed"
          onClick={() => onNavigate('/equipment')}
        />
        <StatCard
          label="Due Soon"
          value={dueSoonCount}
          supportingText="Scheduled within next 30 days"
          icon={<Clock className="w-5 h-5" />}
          statusVariant="warning"
          trend="Requires scheduling"
          onClick={() => onNavigate('/equipment')}
        />
        <StatCard
          label="Overdue"
          value={overdueCount}
          supportingText="Past calibration tolerance window"
          icon={<AlertTriangle className="w-5 h-5" />}
          statusVariant="danger"
          trend="Quarantine alert"
          onClick={() => onNavigate('/equipment')}
        />
        <StatCard
          label="Calibrated"
          value={calibratedCount}
          supportingText="Compliant with active certificates"
          icon={<CheckCircle2 className="w-5 h-5" />}
          statusVariant="success"
          trend="66.7% operational"
          onClick={() => onNavigate('/equipment')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Breakdown Donut */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader
            title="Calibration Status"
            subtitle="Current metrology distribution"
            action={<PieIcon className="w-4 h-4 text-slate-400" />}
          />
          <CardContent className="flex-1 flex flex-col justify-between pt-2">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val} instruments`, 'Count']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend Breakdown */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
              <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                <p className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
                  Calibrated
                </p>
                <p className="text-lg font-bold text-emerald-700 mt-0.5">{calibratedCount}</p>
                <p className="text-[10px] text-emerald-600">66.7%</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-100">
                <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">
                  Due Soon
                </p>
                <p className="text-lg font-bold text-amber-700 mt-0.5">{dueSoonCount}</p>
                <p className="text-[10px] text-amber-600">20.8%</p>
              </div>
              <div className="p-2 rounded-lg bg-rose-50/60 border border-rose-100">
                <p className="text-[10px] font-semibold text-rose-800 uppercase tracking-wider">
                  Overdue
                </p>
                <p className="text-lg font-bold text-rose-700 mt-0.5">{overdueCount}</p>
                <p className="text-[10px] text-rose-600">12.5%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Activity Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Calibration Trend"
            subtitle="Monthly calibration verification volume (last 6 months)"
            action={<TrendingUp className="w-4 h-4 text-slate-400" />}
          />
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
                  />
                  <Bar dataKey="passed" name="Passed" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="adjusted" name="Adjusted" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="overdue" name="Overdue Flag" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Bottom Section: Upcoming Calibrations & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Calibrations Table (2 cols) */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader
            title="Upcoming Calibrations"
            subtitle="Laboratory equipment requiring attention and calibration actions"
            action={
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onNavigate('/equipment')}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
                iconPosition="right"
              >
                View all
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
              {recentActivities.map((act) => {
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
