import React, { useState } from 'react';
import { ArrowLeft, Save, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/common/Button';
import { FormField, Input, Select, Textarea } from '../components/common/FormField';
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
  const [formData, setFormData] = useState({
    name: '',
    code: `EQ-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
    category: 'Balances & Scales' as Equipment['category'],
    manufacturer: '',
    model: '',
    serialNumber: '',
    department: 'Analytical Chemistry' as Equipment['department'],
    location: '',
    purchaseDate: '2026-01-15',
    calibrationIntervalMonths: 6,
    lastCalibrationDate: '2026-08-01',
    description: '',
    tolerance: '±0.01 %',
    assignedTechnician: 'Dr. Sarah Lin',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Equipment name is required.';
    if (!formData.code.trim()) newErrors.code = 'Equipment code is required.';
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
      // 1. Send to backend API
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
        description: formData.description.trim() || undefined,
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

            <FormField label="Equipment Category" required>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
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

            <FormField label="Laboratory Department" required>
              <Select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value as any })}
              >
                <option value="Analytical Chemistry">Analytical Chemistry</option>
                <option value="Quality Control">Quality Control</option>
                <option value="Bioassay">Bioassay</option>
                <option value="Microbiology">Microbiology</option>
                <option value="R&D Formulation">R&D Formulation</option>
              </Select>
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

            <FormField label="Last Calibration Date" required>
              <Input
                type="date"
                value={formData.lastCalibrationDate}
                onChange={(e) => setFormData({ ...formData, lastCalibrationDate: e.target.value })}
              />
            </FormField>

            <FormField label="Acceptable Error / Tolerance">
              <Input
                placeholder="e.g. ±0.0001 g"
                value={formData.tolerance}
                onChange={(e) => setFormData({ ...formData, tolerance: e.target.value })}
              />
            </FormField>

            <FormField label="Lead Metrologist / Assignee">
              <Input
                value={formData.assignedTechnician}
                onChange={(e) => setFormData({ ...formData, assignedTechnician: e.target.value })}
              />
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
