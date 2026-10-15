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
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { Pagination } from '../components/common/Pagination';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { Modal } from '../components/common/Modal';
import { FormField, Input, Select, Textarea } from '../components/common/FormField';
import { CsvImportModal } from '../components/equipment/CsvImportModal';
import { Equipment, AuthUser } from '../types';
import { api } from '../services/api';

interface EquipmentListPageProps {
  equipmentList: Equipment[];
  onNavigate: (path: string) => void;
  onOpenCalibrateModal?: (eq: Equipment) => void;
  onRefreshList?: () => Promise<void>;
  onDeleteEquipment?: (id: string) => Promise<void>;
  onUpdateEquipment?: (id: string, updates: any) => Promise<void>;
  currentUser?: AuthUser | null;
}

export const EquipmentListPage: React.FC<EquipmentListPageProps> = ({
  equipmentList,
  onNavigate,
  onOpenCalibrateModal,
  onRefreshList,
  onDeleteEquipment,
  onUpdateEquipment,
  currentUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'nextCalibrationDate' | 'daysRemaining'>('daysRemaining');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Edit modal state
  const [editTarget, setEditTarget] = useState<Equipment | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    category: 'Balances & Scales' as Equipment['category'],
    location: '',
    department: 'Analytical Chemistry' as Equipment['department'],
    calibrationIntervalMonths: 6,
    description: '',
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Success toast/message state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Bulk CSV Import modal state
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);

  const pageSize = 8;

  // Extract unique categories & locations
  const categories = useMemo(() => {
    const rawCategories = equipmentList
      .map((e) => e.category)
      .filter((c): c is NonNullable<typeof c> => Boolean(c && typeof c === 'string' && c.trim() && (c as string) !== 'All'));
    return ['All', ...Array.from(new Set(rawCategories))];
  }, [equipmentList]);

  const locations = useMemo(() => {
    const rawLocations = equipmentList
      .map((e) => e.department)
      .filter((l): l is NonNullable<typeof l> => Boolean(l && typeof l === 'string' && l.trim() && (l as string) !== 'All'));
    return ['All', ...Array.from(new Set(rawLocations))];
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefreshList) {
        await onRefreshList();
      }
      setToastMessage('Equipment list refreshed successfully.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleSort = (field: 'name' | 'code' | 'nextCalibrationDate' | 'daysRemaining') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (eq: Equipment) => {
    setActiveMenuId(null);
    setEditTarget(eq);
    setEditError(null);
    setEditForm({
      name: eq.name,
      category: eq.category,
      location: eq.location,
      department: eq.department,
      calibrationIntervalMonths: eq.calibrationIntervalMonths,
      description: eq.description || '',
    });
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    if (!editForm.name.trim()) {
      setEditError('Equipment name cannot be empty.');
      return;
    }

    setIsSubmittingEdit(true);
    setEditError(null);

    try {
      if (onUpdateEquipment) {
        await onUpdateEquipment(editTarget.id, {
          name: editForm.name.trim(),
          category: editForm.category,
          location: editForm.location.trim(),
          department: editForm.department,
          calibration_interval_days: editForm.calibrationIntervalMonths * 30,
          description: editForm.description.trim(),
        });
      } else {
        await api.updateEquipment(editTarget.id, {
          name: editForm.name.trim(),
          category: editForm.category,
          location: editForm.location.trim(),
          department: editForm.department,
          calibration_interval_days: editForm.calibrationIntervalMonths * 30,
          description: editForm.description.trim(),
        });
        if (onRefreshList) await onRefreshList();
      }

      setEditTarget(null);
      setToastMessage(`Updated ${editTarget.code} successfully.`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update equipment on the backend.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Open Delete Confirmation
  const handleOpenDelete = (eq: Equipment) => {
    setActiveMenuId(null);
    setDeleteTarget(eq);
    setDeleteError(null);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      if (onDeleteEquipment) {
        await onDeleteEquipment(deleteTarget.id);
      } else {
        await api.deleteEquipment(deleteTarget.id);
        if (onRefreshList) await onRefreshList();
      }

      const deletedCode = deleteTarget.code;
      setDeleteTarget(null);
      setToastMessage(`Deleted equipment ${deletedCode} and its calibration records.`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete equipment from backend.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Laboratory Equipment Registry
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              {equipmentList.length} Instruments
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Complete database of laboratory assets, calibration intervals, and compliance statuses.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCsvImportOpen(true)}
            icon={<FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />}
          >
            Import CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            disabled={isRefreshing}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('/equipment/new')}
            icon={<Plus className="w-4 h-4" />}
          >
            + Add Equipment
          </Button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by code, model, name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Categories</option>
            {categories.filter((c) => c && c !== 'All').map((c, idx) => (
              <option key={`cat-${c || idx}`} value={c}>{c}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="calibrated">Calibrated</option>
            <option value="due_soon">Due Soon</option>
            <option value="overdue">Overdue</option>
          </select>

          {/* Location/Department Filter */}
          <select
            value={locationFilter}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Departments</option>
            {locations.filter((l) => l && l !== 'All').map((loc, idx) => (
              <option key={`loc-${loc || idx}`} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        {/* Filter stats & Reset */}
        {(searchQuery || categoryFilter !== 'All' || statusFilter !== 'All' || locationFilter !== 'All') && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
            <span>
              Showing {filteredList.length} of {equipmentList.length} records matching criteria
            </span>
            <button
              onClick={handleResetFilters}
              className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Equipment Table */}
      {filteredList.length === 0 ? (
        <EmptyState
          icon={<SlidersHorizontal className="w-6 h-6 text-slate-400" />}
          title={equipmentList.length === 0 ? "No Instruments Registered" : "No Equipment Found"}
          description={
            equipmentList.length === 0
              ? "Your laboratory equipment registry is currently empty. Register your first instrument to begin tracking calibration schedules."
              : "No instruments match your active search and filter criteria. Try adjusting your parameters or clear all filters."
          }
          actionLabel={equipmentList.length === 0 ? "+ Register Equipment" : "Clear Filters"}
          onAction={equipmentList.length === 0 ? () => onNavigate('/equipment/new') : handleResetFilters}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Instrument Name</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleSort('code')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Code</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Last Calibrated</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleSort('nextCalibrationDate')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Next Due</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.map((eq, idx) => (
                  <tr
                    key={eq.id ? `${eq.id}-${idx}` : `eq-${idx}`}
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
                                    onClick={() => handleOpenEdit(eq)}
                                    className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Edit Metadata</span>
                                  </button>
                                  {currentUser?.role === 'ADMIN' && (
                                    <button
                                      onClick={() => handleOpenDelete(eq)}
                                      className="w-full px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      <span>Delete Instrument</span>
                                    </button>
                                  )}
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

      {/* Edit Equipment Modal */}
      {editTarget && (
        <Modal
          isOpen={true}
          onClose={() => setEditTarget(null)}
          title={`Edit ${editTarget.name} (${editTarget.code})`}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{editError}</span>
              </div>
            )}

            <FormField label="Instrument Name" required>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Category" required>
                <Select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value as any })}
                >
                  <option value="Balances & Scales">Balances & Scales</option>
                  <option value="Spectroscopy">Spectroscopy</option>
                  <option value="Centrifuges">Centrifuges</option>
                  <option value="Electrochemistry">Electrochemistry</option>
                  <option value="Chromatography">Chromatography</option>
                  <option value="Thermal & Environmental">Thermal & Environmental</option>
                  <option value="Sterilization">Sterilization</option>
                </Select>
              </FormField>

              <FormField label="Department" required>
                <Select
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value as any })}
                >
                  <option value="Analytical Chemistry">Analytical Chemistry</option>
                  <option value="Quality Control">Quality Control</option>
                  <option value="Bioassay">Bioassay</option>
                  <option value="Microbiology">Microbiology</option>
                  <option value="R&D Formulation">R&D Formulation</option>
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Laboratory Location">
                <Input
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  placeholder="e.g. Lab 2B - Bench 04"
                />
              </FormField>

              <FormField label="Interval (Months)" required>
                <Select
                  value={editForm.calibrationIntervalMonths}
                  onChange={(e) => setEditForm({ ...editForm, calibrationIntervalMonths: Number(e.target.value) })}
                >
                  <option value={1}>1 Month (High Frequency)</option>
                  <option value={3}>3 Months (Quarterly)</option>
                  <option value={6}>6 Months (Semi-Annual)</option>
                  <option value={12}>12 Months (Annual)</option>
                </Select>
              </FormField>
            </div>

            <FormField label="Description / Protocol Remarks">
              <Textarea
                rows={2}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setEditTarget(null)}
                disabled={isSubmittingEdit}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={isSubmittingEdit}
                icon={isSubmittingEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : undefined}
              >
                {isSubmittingEdit ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteTarget(null)}
          title="Confirm Instrument Deletion"
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 leading-relaxed">
                <p className="font-semibold">This action cannot be undone.</p>
                <p className="mt-1 text-rose-800">
                  Deleting <strong>{deleteTarget.name}</strong> ({deleteTarget.code}) will permanently remove the instrument and cascade-delete all its associated calibration logs and certificate references from the database.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-100 text-rose-900 text-xs rounded-lg">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                icon={isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        existingEquipment={equipmentList}
        onImportSuccess={async (importedCount) => {
          if (onRefreshList) {
            await onRefreshList();
          }
          setToastMessage(`Bulk import successful: ${importedCount} equipment record${importedCount === 1 ? '' : 's'} registered.`);
          setTimeout(() => setToastMessage(null), 4000);
        }}
      />
    </div>
  );
};
