import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Save, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Sparkles, TrendingUp, TrendingDown, Check } from 'lucide-react';
import { Button } from '../components/common/Button';
import { FormField, Input, Select, Textarea } from '../components/common/FormField';
import { AutocompleteInput } from '../components/common/AutocompleteInput';
import { SCHOOL_COLLEGE_CATEGORIES, SCHOOL_COLLEGE_DEPARTMENTS } from '../constants/schoolLabPresets';
import { calculateCalibrationMetrics } from '../utils/calibrationDateHelper';
import { predictCalibrationInterval } from '../utils/calibrationIntervalMl';
import { StatusBadge } from '../components/common/StatusBadge';
import { Equipment } from '../types';
import { api } from '../services/api';

interface AddEquipmentPageProps {
  onNavigate: (path: string) => void;
  onAddEquipment: (newEquipment: Equipment) => void | Promise<void>;
}

export const AddEquipmentPage: React.FC<AddEquipmentPageProps> = ({
  onNavigate,
  onAddEquipment,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    name: '',
    code: `EQ-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
    category: 'Measurement & Metrology' as Equipment['category'],
    manufacturer: '',
    model: '',
    serialNumber: '',
    department: 'Physics Lab' as Equipment['department'],
    location: '',
    purchaseDate: todayStr,
    calibrationIntervalMonths: 6,
    lastCalibrationDate: todayStr,
    description: '',
    tolerance: '±0.01 %',
    assignedTechnician: 'Mohanraja Technician',
    assignedTechnicianEmail: 'mohanraja.ad24@bitsathy.ac.in',
  });

  const [technicians, setTechnicians] = useState<Array<{ name: string; email: string }>>([
    { name: 'Mohanraja Technician', email: 'mohanraja.ad24@bitsathy.ac.in' },
    { name: 'Asokan Mounesh (Administrator)', email: 'asokanmounesh@gmail.com' },
  ]);

  useEffect(() => {
    api.listUsers().then((users) => {
      if (users && users.length > 0) {
        const mapped = users.map((u) => ({ name: u.name, email: u.email }));
        setTechnicians(mapped);
        if (mapped.length > 0) {
          setFormData((prev) => ({
            ...prev,
            assignedTechnician: prev.assignedTechnician || mapped[0].name,
            assignedTechnicianEmail: prev.assignedTechnicianEmail || mapped[0].email,
          }));
        }
      }
    }).catch(() => {});
  }, []);

  const mlRecommendation = useMemo(() => {
    return predictCalibrationInterval({
      currentIntervalMonths: formData.calibrationIntervalMonths,
      category: formData.category,
      department: formData.department,
      purchaseDate: formData.purchaseDate || undefined,
      calibrationRecords: [],
    });
  }, [formData.calibrationIntervalMonths, formData.category, formData.department, formData.purchaseDate]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Equipment name is required.';
    if (!formData.code.trim()) newErrors.code = 'Equipment code is required.';
    if (!formData.category.trim()) newErrors.category = 'Equipment category is required.';
    if (!formData.department.trim()) newErrors.department = 'Laboratory department is required.';
    if (!formData.manufacturer.trim()) newErrors.manufacturer = 'Manufacturer is required.';
    if (!formData.model.trim()) newErrors.model = 'Model number is required.';
    if (!formData.serialNumber.trim()) newErrors.serialNumber = 'Serial number is required.';
    if (!formData.location.trim()) newErrors.location = 'Specific laboratory bench/room location is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackendError(null);
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const metrics = calculateCalibrationMetrics(formData.lastCalibrationDate, formData.calibrationIntervalMonths);

      // 1. Send to backend API with accurately computed next_calibration_date & status
      const createdItem = await api.createEquipment({
        equipment_code: formData.code.trim(),
        name: formData.name.trim(),
        category: formData.category,
        manufacturer: formData.manufacturer.trim(),
        model_number: formData.model.trim(),
        serial_number: formData.serialNumber.trim(),
        location: formData.location.trim(),
        department: formData.department,
        purchase_date: formData.purchaseDate,
        calibration_interval_days: Number(formData.calibrationIntervalMonths) * 30,
        last_calibration_date: formData.lastCalibrationDate,
        next_calibration_date: metrics.nextCalibrationDate,
        status: metrics.status.toUpperCase(),
        description: formData.description.trim() || undefined,
        assigned_technician: formData.assignedTechnician,
        assigned_technician_email: formData.assignedTechnicianEmail || undefined,
      });

      // 2. Notify parent state
      await onAddEquipment(createdItem);

      setIsSuccess(true);
      setTimeout(() => {
        onNavigate('/equipment');
      }, 700);
    } catch (err: any) {
      console.error('[AddEquipment] Backend error:', err);
      setBackendError(err.message || 'Failed to register equipment. Please check input parameters.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button & Title */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/equipment')}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Equipment
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Register New Laboratory Instrument
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Input metrological specifications, tolerance limits, and calibration intervals.
            </p>
          </div>
        </div>
      </div>

      {/* Backend Error Alert */}
      {backendError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-rose-900">Registration Error</h3>
            <p className="text-xs text-rose-700 mt-0.5">{backendError}</p>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {isSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-emerald-900">Instrument Registered Successfully!</h3>
            <p className="text-xs text-emerald-700">Redirecting to equipment registry...</p>
          </div>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              1. Instrument Identification
            </h2>
            <span className="text-[11px] text-slate-400">* Required fields</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Instrument Name" error={errors.name} required>
              <Input
                placeholder="e.g. Analytical Balance XPR205"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </FormField>

            <FormField label="Equipment Asset Code" error={errors.code} required>
              <Input
                placeholder="e.g. EQ-2026-101"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </FormField>

            <FormField
              label="Equipment Category"
              error={errors.category}
              helperText="Select a school/college preset or type any custom category"
              required
            >
              <AutocompleteInput
                value={formData.category}
                onChange={(val) => {
                  setFormData({ ...formData, category: val as any });
                  if (errors.category) setErrors({ ...errors, category: '' });
                }}
                options={SCHOOL_COLLEGE_CATEGORIES}
                placeholder="e.g. Measurement & Metrology, Optical Instruments..."
                emptyCustomHint="Use custom category"
              />
            </FormField>

            <FormField
              label="Laboratory Department"
              error={errors.department}
              helperText="Select a school/college lab or type any custom department"
              required
            >
              <AutocompleteInput
                value={formData.department}
                onChange={(val) => {
                  setFormData({ ...formData, department: val as any });
                  if (errors.department) setErrors({ ...errors, department: '' });
                }}
                options={SCHOOL_COLLEGE_DEPARTMENTS}
                placeholder="e.g. Physics Lab, Chemistry Lab, Biology Lab..."
                emptyCustomHint="Use custom department"
              />
            </FormField>
          </div>
        </div>

        {/* Section 2: Technical Specifications */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">
              2. Technical & Manufacturer Specifications
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Manufacturer / OEM" error={errors.manufacturer} required>
              <Input
                placeholder="e.g. Mettler Toledo"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              />
            </FormField>

            <FormField label="Model Number" error={errors.model} required>
              <Input
                placeholder="e.g. XPR205 DualRange"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </FormField>

            <FormField label="Serial Number" error={errors.serialNumber} required>
              <Input
                placeholder="e.g. MT-88492019"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Physical Laboratory Location" error={errors.location} required>
              <Input
                placeholder="e.g. Lab 1A - Clean Bench 02"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </FormField>

            <FormField label="Commission / Purchase Date">
              <Input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              />
            </FormField>
          </div>
        </div>

        {/* Section 3: Calibration Interval & Compliance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              3. Calibration Schedule & Metrology Specs
            </h2>
            <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              <ShieldCheck className="w-3.5 h-3.5" /> ISO 17025 Compliant
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Calibration Interval" required>
              <Select
                value={formData.calibrationIntervalMonths}
                onChange={(e) => setFormData({ ...formData, calibrationIntervalMonths: Number(e.target.value) })}
              >
                <option value={1}>1 Month (High Frequency)</option>
                <option value={3}>3 Months (Quarterly Verification)</option>
                <option value={6}>6 Months (Semi-Annual Routine)</option>
                <option value={12}>12 Months (Annual Recertification)</option>
              </Select>
            </FormField>

            <FormField label="Last Calibration Date" required helperText="Date when instrument was last verified">
              <Input
                type="date"
                value={formData.lastCalibrationDate}
                onChange={(e) => setFormData({ ...formData, lastCalibrationDate: e.target.value })}
              />
            </FormField>
          </div>

          {/* Embedded ML Interval Recommendation Assistant */}
          <div className="p-3 bg-gradient-to-r from-indigo-50/90 via-slate-50 to-blue-50/70 border border-indigo-200/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-md bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800">
                    ML Recommended Interval: <span className="font-bold font-mono text-indigo-700">{mlRecommendation.recommendedIntervalMonths} Months</span> ({mlRecommendation.recommendedIntervalDays} days)
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-600">
                    {mlRecommendation.reliabilityScore}% reliability score
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-[11px] text-slate-500">
                    {mlRecommendation.stabilityGrade}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Adaptive model analyzing {formData.category} metrology norms, apparatus wear curve, and ambient stability.
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center">
              {formData.calibrationIntervalMonths === mlRecommendation.recommendedIntervalMonths ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                  <Check className="w-3.5 h-3.5" /> Matched
                </span>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="bg-white hover:bg-indigo-50 border-indigo-300 text-indigo-700 text-xs font-semibold shadow-2xs"
                  onClick={() => setFormData({ ...formData, calibrationIntervalMonths: mlRecommendation.recommendedIntervalMonths })}
                  icon={<Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
                >
                  Apply ML Recommendation ({mlRecommendation.recommendedIntervalMonths} mo)
                </Button>
              )}
            </div>
          </div>

          {/* Live Calibration Schedule Calculation Preview */}
          {(() => {
            const preview = calculateCalibrationMetrics(formData.lastCalibrationDate, formData.calibrationIntervalMonths);
            return (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Calculated Next Calibration
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {preview.nextCalibrationDate}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      ({preview.daysRemaining < 0
                        ? `${Math.abs(preview.daysRemaining)} days overdue`
                        : preview.daysRemaining === 0
                        ? 'due today'
                        : `due in ${preview.daysRemaining} days`})
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[11px]">Calculated Status:</span>
                  <StatusBadge status={preview.status} size="sm" />
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Acceptable Error / Tolerance">
              <Input
                placeholder="e.g. ±0.0001 g"
                value={formData.tolerance}
                onChange={(e) => setFormData({ ...formData, tolerance: e.target.value })}
              />
            </FormField>

            <FormField
              label="Assigned Technician (Sole Alert Recipient)"
              helperText="ISO 17025 alerts for this instrument will ONLY be sent to this assigned technician"
            >
              <Select
                value={formData.assignedTechnicianEmail || formData.assignedTechnician}
                onChange={(e) => {
                  const selectedEmail = e.target.value;
                  const found = technicians.find((t) => t.email === selectedEmail);
                  setFormData({
                    ...formData,
                    assignedTechnician: found ? found.name : selectedEmail,
                    assignedTechnicianEmail: selectedEmail,
                  });
                }}
              >
                {technicians.map((t, idx) => (
                  <option key={t.email || idx} value={t.email}>
                    {t.name} ({t.email})
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="Instrument Notes, SOP Reference & Traceability">
            <Textarea
              rows={3}
              placeholder="Enter standard operating procedure notes, reference standard batch numbers, or handling requirements..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </FormField>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="outline"
            size="md"
            type="button"
            onClick={() => onNavigate('/equipment')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            disabled={isSubmitting}
            icon={isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          >
            {isSubmitting ? 'Registering with Database...' : 'Register Equipment'}
          </Button>
        </div>
      </form>
    </div>
  );
};
