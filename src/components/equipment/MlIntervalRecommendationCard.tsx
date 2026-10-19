import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Clock,
  Activity,
  Thermometer,
  ShieldAlert,
  ArrowRight,
  Info,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Card, CardHeader, CardContent } from '../common/Card';
import { Equipment, CalibrationRecord } from '../../types';
import { predictCalibrationInterval, IntervalPredictionResult } from '../../utils/calibrationIntervalMl';
import { api } from '../../services/api';

interface MlIntervalRecommendationCardProps {
  equipment: Equipment;
  calibrationHistory?: CalibrationRecord[];
  onIntervalUpdated?: (updatedEquipment: Equipment, prediction: IntervalPredictionResult) => void;
  compact?: boolean;
}

export const MlIntervalRecommendationCard: React.FC<MlIntervalRecommendationCardProps> = ({
  equipment,
  calibrationHistory = [],
  onIntervalUpdated,
  compact = false,
}) => {
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Compute prediction dynamically from equipment and its calibration history
  const prediction: IntervalPredictionResult = predictCalibrationInterval({
    currentIntervalMonths: equipment.calibrationIntervalMonths,
    category: equipment.category,
    department: equipment.department,
    purchaseDate: equipment.purchaseDate,
    calibrationRecords: calibrationHistory.map((c) => ({
      calibrationDate: c.calibrationDate,
      result: c.result,
      environmentalTemp: c.environmentalTemp,
      environmentalHumidity: c.environmentalHumidity,
    })),
  });

  const isCurrentMatchingRecommended =
    equipment.calibrationIntervalMonths === prediction.recommendedIntervalMonths;

  const handleApply = async () => {
    setIsApplying(true);
    setError(null);
    setApplySuccess(null);

    try {
      const res = await api.applyRecommendedInterval(equipment.id);
      setApplySuccess(
        `Calibration interval adjusted to ${prediction.recommendedIntervalMonths} months (${prediction.recommendedIntervalDays} days).`
      );
      if (onIntervalUpdated) {
        onIntervalUpdated(res.equipment, prediction);
      }
    } catch (err: any) {
      console.error('[ML Interval] Error applying interval:', err);
      // Fallback: update equipment via general update
      try {
        const updated = await api.updateEquipment(equipment.id, {
          calibration_interval_days: prediction.recommendedIntervalDays,
        });
        setApplySuccess(
          `Calibration interval adjusted to ${prediction.recommendedIntervalMonths} months (${prediction.recommendedIntervalDays} days).`
        );
        if (onIntervalUpdated) {
          onIntervalUpdated(updated, prediction);
        }
      } catch (fallbackErr: any) {
        setError(fallbackErr.message || 'Failed to update calibration interval.');
      }
    } finally {
      setIsApplying(false);
    }
  };

  const getGradeIcon = () => {
    if (prediction.stabilityGrade === 'High Stability') {
      return <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />;
    }
    if (prediction.stabilityGrade === 'Moderate Stability') {
      return <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5" />;
    }
    return <span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1.5" />;
  };

  const getActionBadge = () => {
    if (prediction.recommendationAction === 'EXTEND') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
          <TrendingUp className="w-3.5 h-3.5" /> Extend Interval (+{prediction.differenceMonths} mo)
        </span>
      );
    }
    if (prediction.recommendationAction === 'REDUCE') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
          <TrendingDown className="w-3.5 h-3.5" /> Tighten Cycle ({prediction.differenceMonths} mo)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
        <CheckCircle className="w-3.5 h-3.5" /> Optimal Interval Maintained
      </span>
    );
  };

  return (
    <Card className="border-indigo-100/80 shadow-xs overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold tracking-tight uppercase text-indigo-200">
                Adaptive ML Metrology Model
              </h3>
              <p className="text-[11px] text-slate-300">ISO 17025 Interval Recommendation</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-indigo-300 block font-mono">Confidence</span>
            <span className="text-xs font-mono font-bold text-white tabular-nums">
              {prediction.confidence}%
            </span>
          </div>
        </div>

        {/* Current vs Recommended Comparison Header */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 p-2.5 bg-white/5 rounded-lg border border-white/10 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Current Cycle</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-bold font-mono text-white tabular-nums">
                {equipment.calibrationIntervalMonths}
              </span>
              <span className="text-[11px] text-slate-300">Months</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              ({equipment.calibrationIntervalMonths * 30} days)
            </span>
          </div>

          <div className="border-l border-white/10 pl-2.5">
            <span className="text-[10px] text-indigo-300 uppercase tracking-wider block">ML Recommended</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-bold font-mono text-indigo-200 tabular-nums">
                {prediction.recommendedIntervalMonths}
              </span>
              <span className="text-[11px] text-indigo-100">Months</span>
            </div>
            <span className="text-[10px] text-indigo-300/80 font-mono">
              ({prediction.recommendedIntervalDays} days)
            </span>
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-4 text-xs">
        {/* Status Action Banner */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-slate-100">
          <div className="flex items-center text-xs font-semibold text-slate-700">
            {getGradeIcon()}
            <span>{prediction.stabilityGrade}</span>
            <span className="text-slate-400 mx-1.5">·</span>
            <span className="font-mono tabular-nums text-slate-600">{prediction.reliabilityScore}%</span>
            <span className="text-slate-400 ml-1 text-[11px] font-normal">reliability score</span>
          </div>
          {getActionBadge()}
        </div>

        {/* Explanation text */}
        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/80">
          {prediction.explanation}
        </p>

        {/* Three Evaluated Operational Factors */}
        {!compact && (
          <div className="space-y-2.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block">
              Evaluated Operational Vectors
            </span>

            {/* Factor 1: Historical Calibration Drift */}
            <div className="p-2.5 bg-slate-50/70 rounded-lg border border-slate-200/60 space-y-1">
              <div className="flex items-center justify-between text-xs font-medium text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  Historical Drift & Pass Ratio
                </span>
                <span className="font-mono text-slate-700 font-semibold tabular-nums">
                  {prediction.factors.historicalPassRate}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Analyzed {prediction.factors.totalCalibrationsAnalyzed} past calibrations: {prediction.factors.consecutivePasses} consecutive passes
                {prediction.factors.adjustmentCount > 0 && `, ${prediction.factors.adjustmentCount} adjustments`}
                {prediction.factors.failureCount > 0 && `, ${prediction.factors.failureCount} failures`}.
              </p>
            </div>

            {/* Factor 2: Instrument Age & Wear Curve */}
            <div className="p-2.5 bg-slate-50/70 rounded-lg border border-slate-200/60 space-y-1">
              <div className="flex items-center justify-between text-xs font-medium text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Apparatus Age & Operational Wear
                </span>
                <span className="font-mono text-slate-700 font-semibold tabular-nums">
                  {prediction.factors.ageInYears} yrs (×{prediction.factors.ageFactor})
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Depreciation wear curve applied based on service age since {equipment.purchaseDate || 'initial commissioning'}.
              </p>
            </div>

            {/* Factor 3: Environmental Stability */}
            <div className="p-2.5 bg-slate-50/70 rounded-lg border border-slate-200/60 space-y-1">
              <div className="flex items-center justify-between text-xs font-medium text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-emerald-600" />
                  Environmental Variance Stability
                </span>
                <span className="font-mono text-slate-700 font-semibold tabular-nums">
                  {prediction.factors.environmentalStabilityScore}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Ambient laboratory temperature (°C) and relative humidity (%RH) fluctuation variance across calibration records.
              </p>
            </div>
          </div>
        )}

        {/* Feedback / Error Alerts */}
        {applySuccess && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{applySuccess}</span>
          </div>
        )}

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1-Click Apply Action Button */}
        <div className="pt-2">
          {isCurrentMatchingRecommended ? (
            <div className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 text-slate-600 rounded-lg font-medium text-xs border border-slate-200">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Interval is currently optimized at {equipment.calibrationIntervalMonths} months
            </div>
          ) : (
            <Button
              variant="primary"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              size="sm"
              onClick={handleApply}
              disabled={isApplying}
              icon={isApplying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            >
              {isApplying
                ? 'Applying Recommended Interval...'
                : `Update Interval to Recommended (${prediction.recommendedIntervalMonths} Months)`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
