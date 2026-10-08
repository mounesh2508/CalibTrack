import React, { useState } from 'react';
import { ArrowLeft, Save, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/common/Button';
import { FormField, Input, Select, Textarea } from '../components/common/FormField';
import { Equipment } from '../types';

interface AddEquipmentPageProps {
  onNavigate: (path: string) => void;
  onAddEquipment: (newEquipment: Equipment) => void;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    // Calculate next calibration date roughly
    const lastDate = new Date(formData.lastCalibrationDate);
    const nextDate = new Date(lastDate);
    nextDate.setMonth(nextDate.getMonth() + Number(formData.calibrationIntervalMonths));
    const nextCalibrationDateStr = nextDate.toISOString().split('T')[0];

    const today = new Date();
    const diffTime = nextDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status: Equipment['status'] = 'calibrated';
    if (daysRemaining < 0) status = 'overdue';
    else if (daysRemaining <= 30) status = 'due_soon';

    const newEquip: Equipment = {
      id: `EQ-${Date.now().toString().slice(-4)}`,
      code: formData.code,
      name: formData.name,
      category: formData.category,
      manufacturer: formData.manufacturer,
      model: formData.model,
      serialNumber: formData.serialNumber,
      department: formData.department,
      location: formData.location,
      purchaseDate: formData.purchaseDate,
      calibrationIntervalMonths: Number(formData.calibrationIntervalMonths),
      lastCalibrationDate: formData.lastCalibrationDate,
      nextCalibrationDate: nextCalibrationDateStr,
      daysRemaining,
      status,
      assignedTechnician: formData.assignedTechnician,
      description: formData.description || 'Newly registered laboratory equipment in validation cycle.',
      tolerance: formData.tolerance,
    };

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      onAddEquipment(newEquip);
      setTimeout(() => {
        onNavigate('/equipment');
      }, 900);
    }, 500);
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
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Register Equipment
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter metrological specifications and calibration parameters.
            </p>
          </div>
        </div>
      </div>

      {isSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold">Equipment registered successfully!</p>
            <p className="text-xs text-emerald-700">Redirecting to equipment registry...</p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Equipment Information */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                1. Equipment Information
              </h3>
              <p className="text-xs text-slate-500">
                Primary identifier and manufacturer attributes
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              MET-REG-SPEC
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Equipment Name" required error={errors.name}>
              <Input
                placeholder="e.g. Analytical Balance XPR205"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={!!errors.name}
              />
            </FormField>

            <FormField
              label="Equipment Code"
              required
              error={errors.code}
              helperText="Unique internal asset identification code"
            >
              <Input
                placeholder="EQ-2026-XXX"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                error={!!errors.code}
                className="font-mono"
              />
            </FormField>

            <FormField label="Category" required>
              <Select
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value as Equipment['category'],
                  })
                }
              >
                <option value="Balances & Scales">Balances & Scales</option>
                <option value="Spectroscopy">Spectroscopy</option>
                <option value="Centrifuges">Centrifuges</option>
                <option value="Electrochemistry">Electrochemistry</option>
                <option value="Thermal & Environmental">Thermal & Environmental</option>
                <option value="Chromatography">Chromatography</option>
                <option value="Sterilization">Sterilization</option>
              </Select>
            </FormField>

            <FormField label="Manufacturer" required error={errors.manufacturer}>
              <Input
                placeholder="e.g. Mettler Toledo, Shimadzu, Thermo Scientific"
                value={formData.manufacturer}
                onChange={(e) =>
                  setFormData({ ...formData, manufacturer: e.target.value })
                }
                error={!!errors.manufacturer}
              />
            </FormField>

            <FormField label="Model Number" required error={errors.model}>
              <Input
                placeholder="e.g. XPR205 DualRange"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                error={!!errors.model}
              />
            </FormField>

            <FormField label="Serial Number" required error={errors.serialNumber}>
              <Input
                placeholder="e.g. MT-88492019"
                value={formData.serialNumber}
                onChange={(e) =>
                  setFormData({ ...formData, serialNumber: e.target.value })
                }
                error={!!errors.serialNumber}
                className="font-mono"
              />
            </FormField>
          </div>
        </div>

        {/* Section 2: Location & Deployment */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-900">2. Laboratory Location</h3>
            <p className="text-xs text-slate-500">
              Department custody and laboratory physical location
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Department" required>
              <Select
                value={formData.department}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    department: e.target.value as Equipment['department'],
                  })
                }
              >
                <option value="Analytical Chemistry">Analytical Chemistry</option>
                <option value="Microbiology">Microbiology</option>
                <option value="Quality Control">Quality Control</option>
                <option value="R&D Formulation">R&D Formulation</option>
                <option value="Bioassay">Bioassay</option>
              </Select>
            </FormField>

            <FormField
              label="Laboratory Location"
              required
              error={errors.location}
              helperText="Room number, bench designation, or cleanroom bay"
            >
              <Input
                placeholder="e.g. Lab 1A - Clean Bench 02"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                error={!!errors.location}
              />
            </FormField>
          </div>
        </div>

        {/* Section 3: Calibration Parameters */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              3. Calibration Parameters
            </h3>
            <p className="text-xs text-slate-500">
              Standard calibration interval and previous verification date
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              label="Calibration Interval"
              required
              helperText="Mandatory recertification frequency"
            >
              <Select
                value={formData.calibrationIntervalMonths}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    calibrationIntervalMonths: Number(e.target.value),
                  })
                }
              >
                <option value={3}>3 Months (High Criticality)</option>
                <option value={6}>6 Months (Semi-Annual)</option>
                <option value={12}>12 Months (Annual)</option>
                <option value={24}>24 Months (Biennial)</option>
              </Select>
            </FormField>

            <FormField label="Last Calibration Date" required>
              <Input
                type="date"
                value={formData.lastCalibrationDate}
                onChange={(e) =>
                  setFormData({ ...formData, lastCalibrationDate: e.target.value })
                }
              />
            </FormField>

            <FormField
              label="Measurement Tolerance"
              helperText="Acceptable deviation threshold"
            >
              <Input
                placeholder="e.g. ±0.0001 g or ±0.02 pH"
                value={formData.tolerance}
                onChange={(e) =>
                  setFormData({ ...formData, tolerance: e.target.value })
                }
              />
            </FormField>
          </div>
        </div>

        {/* Section 4: Additional Information */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              4. Additional Information
            </h3>
            <p className="text-xs text-slate-500">
              Procurement metadata and application description
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Purchase Date">
              <Input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) =>
                  setFormData({ ...formData, purchaseDate: e.target.value })
                }
              />
            </FormField>

            <FormField label="Assigned Metrologist / Custodian">
              <Input
                placeholder="e.g. Dr. Sarah Lin"
                value={formData.assignedTechnician}
                onChange={(e) =>
                  setFormData({ ...formData, assignedTechnician: e.target.value })
                }
              />
            </FormField>

            <div className="sm:col-span-2">
              <FormField
                label="Description & Operational Purpose"
                helperText="Specify primary assay methods or regulatory scope"
              >
                <Textarea
                  rows={3}
                  placeholder="Describe instrument intended usage, regulatory testing scope (e.g. USP <41>, ICH guidelines), and specific handling precautions..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Form Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onNavigate('/equipment')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            icon={<Save className="w-4 h-4" />}
          >
            Save Equipment
          </Button>
        </div>
      </form>
    </div>
  );
};
