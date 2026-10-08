import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  ExternalLink,
  Wrench,
  Edit,
  Trash2,
  Download,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { Pagination } from '../components/common/Pagination';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { Equipment } from '../types';

interface EquipmentListPageProps {
  equipmentList: Equipment[];
  onNavigate: (path: string) => void;
  onOpenCalibrateModal?: (eq: Equipment) => void;
}

export const EquipmentListPage: React.FC<EquipmentListPageProps> = ({
  equipmentList,
  onNavigate,
  onOpenCalibrateModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'nextCalibrationDate' | 'daysRemaining'>('daysRemaining');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [simulatedLoading, setSimulatedLoading] = useState(false);

  const pageSize = 8;

  // Extract unique categories & locations
  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(equipmentList.map((e) => e.category)))];
  }, [equipmentList]);

  const locations = useMemo(() => {
    return ['All', ...Array.from(new Set(equipmentList.map((e) => e.department)))];
  }, [equipmentList]);

  // Filter and sort items
  const filteredList = useMemo(() => {
    return equipmentList
      .filter((item) => {
        const matchesSearch =
          searchQuery === '' ||
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
        const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
        const matchesLocation = locationFilter === 'All' || item.department === locationFilter;

        return matchesSearch && matchesCategory && matchesStatus && matchesLocation;
      })
      .sort((a, b) => {
        let compare = 0;
        if (sortBy === 'name') compare = a.name.localeCompare(b.name);
        else if (sortBy === 'code') compare = a.code.localeCompare(b.code);
        else if (sortBy === 'nextCalibrationDate') compare = a.nextCalibrationDate.localeCompare(b.nextCalibrationDate);
        else if (sortBy === 'daysRemaining') compare = a.daysRemaining - b.daysRemaining;

        return sortOrder === 'asc' ? compare : -compare;
      });
  }, [equipmentList, searchQuery, categoryFilter, statusFilter, locationFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredList.length / pageSize);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setStatusFilter('All');
    setLocationFilter('All');
    setCurrentPage(1);
  };

  const toggleSort = (field: 'name' | 'code' | 'nextCalibrationDate' | 'daysRemaining') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleTriggerSimulatedLoading = () => {
    setSimulatedLoading(true);
    setTimeout(() => setSimulatedLoading(false), 600);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Equipment</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage and monitor laboratory equipment and calibration status.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerSimulatedLoading}
            icon={<RefreshCw className="w-3.5 h-3.5 text-slate-500" />}
            title="Simulate refreshing database records"
          >
            Refresh
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

      {/* Toolbar: Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search code, name, model, serial..."
              className="w-full h-10 pl-9 pr-3.5 text-sm bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors cursor-pointer"
            >
              <option value="All">All Categories</option>
              {categories.filter((c) => c !== 'All').map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="calibrated">Calibrated</option>
              <option value="due_soon">Due Soon</option>
              <option value="overdue">Overdue</option>
              <option value="maintenance">Maintenance</option>
              <option value="out_of_service">Out of Service</option>
            </select>
          </div>

          {/* Location / Department Filter */}
          <div>
            <select
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors cursor-pointer"
            >
              <option value="All">All Departments</option>
              {locations.filter((l) => l !== 'All').map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Bar / Results Count */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-slate-800">{filteredList.length}</strong> of{' '}
              {equipmentList.length} total units
            </span>
            {(searchQuery || categoryFilter !== 'All' || statusFilter !== 'All' || locationFilter !== 'All') && (
              <button
                onClick={handleResetFilters}
                className="text-blue-600 hover:text-blue-800 font-medium ml-2 underline cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Sort:</span>
            <button
              onClick={() => toggleSort('daysRemaining')}
              className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                sortBy === 'daysRemaining' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Due Date {sortBy === 'daysRemaining' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('name')}
              className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                sortBy === 'name' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('code')}
              className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                sortBy === 'code' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Code {sortBy === 'code' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Table or State */}
      {simulatedLoading ? (
        <LoadingState rows={8} message="Fetching calibrated instruments registry..." />
      ) : filteredList.length === 0 ? (
        <EmptyState
          icon={<Filter className="w-6 h-6 text-slate-400" />}
          title="No equipment found"
          description="We couldn't find any equipment matching your current filter criteria. Try adjusting your search query or reset filters."
          actionLabel="Reset Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-medium uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Equipment</th>
                  <th className="py-3 px-4">Equipment Code</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Last Calibration</th>
                  <th className="py-3 px-4">Next Calibration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.map((eq) => (
                  <tr
                    key={eq.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => onNavigate(`/equipment/${eq.id}`)}
                  >
                    {/* Equipment Name & Model */}
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {eq.name}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {eq.manufacturer} · {eq.model}
                        </p>
                      </div>
                    </td>

                    {/* Equipment Code */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {eq.code}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 text-slate-600">
                      {eq.category}
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <p className="text-slate-800 font-medium">{eq.department}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{eq.location}</p>
                    </td>

                    {/* Last Calibration */}
                    <td className="py-3.5 px-4 text-slate-600">
                      {eq.lastCalibrationDate}
                    </td>

                    {/* Next Calibration & Days */}
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-800">{eq.nextCalibrationDate}</p>
                      <p
                        className={`text-[11px] mt-0.5 font-semibold ${
                          eq.daysRemaining < 0
                            ? 'text-rose-600'
                            : eq.daysRemaining <= 14
                            ? 'text-amber-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {eq.daysRemaining < 0
                          ? `${Math.abs(eq.daysRemaining)}d overdue`
                          : eq.daysRemaining === 0
                          ? 'Today'
                          : `in ${eq.daysRemaining} days`}
                      </p>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={eq.status} size="sm" />
                    </td>

                    {/* Actions Menu */}
                    <td
                      className="py-3.5 px-4 text-right relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => onNavigate(`/equipment/${eq.id}`)}
                          title="View Details"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            if (onOpenCalibrateModal) onOpenCalibrateModal(eq);
                            else onNavigate(`/equipment/${eq.id}`);
                          }}
                          className={eq.status === 'overdue' ? 'text-rose-600 border-rose-200 bg-rose-50/50' : ''}
                        >
                          Calibrate
                        </Button>

                        {/* Dropdown More */}
                        <div className="relative inline-block">
                          <button
                            onClick={() =>
                              setActiveMenuId(activeMenuId === eq.id ? null : eq.id)
                            }
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === eq.id && (
                            <>
                              <div
                                className="fixed inset-0 z-20"
                                onClick={() => setActiveMenuId(null)}
                              />
                              <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 z-30 py-1 text-left text-xs divide-y divide-slate-100">
                                <div>
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onNavigate(`/equipment/${eq.id}`);
                                    }}
                                    className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Equipment Specs</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      if (onOpenCalibrateModal) onOpenCalibrateModal(eq);
                                    }}
                                    className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Wrench className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Log Calibration</span>
                                  </button>
                                </div>
                                <div>
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onNavigate(`/equipment/${eq.id}`);
                                    }}
                                    className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Edit Metadata</span>
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredList.length}
            itemsPerPage={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};
