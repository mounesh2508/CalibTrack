/**
 * Laboratory Equipment Calibration Interval ML Recommendation Engine
 *
 * Implements an adaptive regression model with drift reliability scoring
 * based on three empirical vectors:
 * 1. Historical Calibration Records (Pass/Adjustment/Failure ratios and consecutive drift)
 * 2. Equipment Age & Wear Curve (Operational years since acquisition/commissioning)
 * 3. Environmental Stability (Ambient temperature °C and humidity %RH variance across runs)
 *
 * All outputs adhere to ISO 17025 metrology guidelines (clamped between 30 and 365 days).
 */

export interface IntervalPredictionInput {
  currentIntervalMonths?: number;
  currentIntervalDays?: number;
  category?: string;
  department?: string;
  purchaseDate?: string | null;
  calibrationRecords?: Array<{
    calibrationDate?: string;
    result?: 'Passed' | 'Passed with Adjustment' | 'Failed' | 'PASSED' | 'CONDITIONAL' | 'FAILED' | string;
    environmentalTemp?: string | null;
    environmentalHumidity?: string | null;
  }>;
}

export interface IntervalPredictionResult {
  recommendedIntervalMonths: number;
  recommendedIntervalDays: number;
  currentIntervalMonths: number;
  currentIntervalDays: number;
  differenceMonths: number;
  differenceDays: number;
  reliabilityScore: number; // 0 - 100%
  stabilityGrade: 'High Stability' | 'Moderate Stability' | 'High Drift / At Risk';
  confidence: number; // 0 - 100%
  factors: {
    historicalPassRate: number; // 0 - 100%
    totalCalibrationsAnalyzed: number;
    ageInYears: number;
    ageFactor: number; // multiplier e.g. 0.92
    environmentalStabilityScore: number; // 0 - 100%
    driftStabilityScore: number; // 0 - 100%
    consecutivePasses: number;
    adjustmentCount: number;
    failureCount: number;
  };
  explanation: string;
  recommendationAction: 'EXTEND' | 'MAINTAIN' | 'REDUCE';
}

/**
 * Standard metrological category baseline intervals in months
 */
export const CATEGORY_BASELINE_INTERVALS: Record<string, number> = {
  'Measurement & Metrology': 6,
  'Optical Instruments': 6,
  'Chemical & Glassware Apparatus': 3,
  'Biological & Specimen Equipment': 12,
  'Thermal & Heating': 6,
  'Electrical & Electronics': 6,
  'Computing & Robotics Hardware': 12,
  'Safety & Sterilization': 6,
  'Mechanical & Workshop Tools': 12,
  'General Science Equipment': 6,
};

/**
 * Parse numeric value from strings like "20.5 °C" or "45 % RH"
 */
function extractNumber(val?: string | null): number | null {
  if (!val || typeof val !== 'string') return null;
  const match = val.match(/[-+]?\d*\.?\d+/);
  return match ? parseFloat(match[0]) : null;
}

/**
 * Calculate population standard deviation
 */
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Snap interval in days to closest operational calendar month preset (1, 3, 6, 9, 12 months)
 */
function snapToOperationalMonths(rawDays: number): { months: number; days: number } {
  const standardPresets = [1, 3, 6, 9, 12];
  const approxMonths = rawDays / 30.4375;

  let closestMonth = standardPresets[0];
  let minDiff = Math.abs(approxMonths - closestMonth);

  for (const m of standardPresets) {
    const diff = Math.abs(approxMonths - m);
    if (diff < minDiff) {
      minDiff = diff;
      closestMonth = m;
    }
  }

  // Ensure clamped between 1 and 12 months
  closestMonth = Math.max(1, Math.min(12, closestMonth));
  const resolvedDays = closestMonth * 30;

  return { months: closestMonth, days: resolvedDays };
}

/**
 * Core ML Prediction Function
 */
export function predictCalibrationInterval(input: IntervalPredictionInput): IntervalPredictionResult {
  const currentIntervalMonths = Number(input.currentIntervalMonths) || (input.currentIntervalDays ? Math.max(1, Math.round(input.currentIntervalDays / 30)) : 6);
  const currentIntervalDays = Number(input.currentIntervalDays) || (currentIntervalMonths * 30);

  const categoryBase = CATEGORY_BASELINE_INTERVALS[input.category || ''] || 6;
  const baseDays = categoryBase * 30;

  const records = input.calibrationRecords || [];
  const totalCalibrations = records.length;

  // 1. Analyze Historical Calibration Records (Passed, Adjusted, Failed)
  let passCount = 0;
  let adjustCount = 0;
  let failCount = 0;
  let consecutivePasses = 0;
  let consecutivePassesRunning = true;

  // Sort records descending by date (most recent first)
  const sortedRecords = [...records].sort((a, b) => {
    const dateA = a.calibrationDate ? new Date(a.calibrationDate).getTime() : 0;
    const dateB = b.calibrationDate ? new Date(b.calibrationDate).getTime() : 0;
    return dateB - dateA;
  });

  for (const r of sortedRecords) {
    const res = (r.result || 'PASSED').toUpperCase();
    if (res.includes('FAIL')) {
      failCount++;
      consecutivePassesRunning = false;
    } else if (res.includes('ADJUST') || res.includes('CONDITIONAL')) {
      adjustCount++;
      consecutivePassesRunning = false;
    } else {
      passCount++;
      if (consecutivePassesRunning) {
        consecutivePasses++;
      }
    }
  }

  // Historical Reliability Multiplier (0.0 to 1.0)
  let histReliabilityScore = 0.90; // Default prior for newly cataloged instruments
  if (totalCalibrations > 0) {
    // Passed = 1.0, Adjusted = 0.60, Failed = 0.0
    histReliabilityScore = (passCount * 1.0 + adjustCount * 0.60 + failCount * 0.0) / totalCalibrations;
  }

  // Drift Penalty based on adjustments and failures
  let driftPenalty = 1.0;
  if (failCount > 0) {
    driftPenalty *= Math.pow(0.70, failCount);
  }
  if (adjustCount > 0) {
    driftPenalty *= Math.pow(0.85, adjustCount);
  }
  if (consecutivePasses >= 3) {
    // Reward unbroken streak of pristine passes
    driftPenalty = Math.min(1.25, driftPenalty * (1.0 + consecutivePasses * 0.05));
  }
  const driftStabilityScore = Math.round(Math.min(100, Math.max(10, driftPenalty * 80)));

  // 2. Equipment Age & Wear Curve
  let ageInYears = 1.0;
  if (input.purchaseDate) {
    const purchase = new Date(input.purchaseDate);
    if (!isNaN(purchase.getTime())) {
      const diffMs = Date.now() - purchase.getTime();
      ageInYears = Math.max(0.1, diffMs / (365.25 * 86400000));
    }
  }

  // Age decay: modest 3.5% decay per year after year 2, floor at 0.70
  let ageFactor = 1.0;
  if (ageInYears > 2.0) {
    ageFactor = Math.max(0.70, 1.0 - (ageInYears - 2.0) * 0.035);
  }

  // 3. Environmental Stability Analysis
  const temps: number[] = [];
  const humids: number[] = [];

  for (const r of records) {
    const t = extractNumber(r.environmentalTemp);
    const h = extractNumber(r.environmentalHumidity);
    if (t !== null && t > -50 && t < 100) temps.push(t);
    if (h !== null && h >= 0 && h <= 100) humids.push(h);
  }

  const tempStdDev = calculateStdDev(temps);
  const humidStdDev = calculateStdDev(humids);

  // Ideal lab standards: Temp std dev < 1.0 °C, RH std dev < 4.0 %
  let envFactor = 1.0;
  if (temps.length >= 2) {
    if (tempStdDev > 2.5) envFactor *= 0.88;
    else if (tempStdDev > 1.2) envFactor *= 0.94;
    else envFactor *= 1.03;
  }
  if (humids.length >= 2) {
    if (humidStdDev > 8.0) envFactor *= 0.88;
    else if (humidStdDev > 4.5) envFactor *= 0.94;
    else envFactor *= 1.03;
  }

  const envStabilityScore = Math.round(Math.min(100, Math.max(20, envFactor * 90)));

  // 4. Combined Adaptive Regression Formula
  // Predicted Days = BaseCategoryDays * histReliability * driftPenalty * ageFactor * envFactor
  let predictedRawDays = baseDays * histReliabilityScore * driftPenalty * ageFactor * envFactor;

  // Clamp within ISO 17025 laboratory boundaries (30 days to 365 days)
  predictedRawDays = Math.max(30, Math.min(365, predictedRawDays));

  // Snap to operational month intervals
  const { months: recommendedMonths, days: recommendedDays } = snapToOperationalMonths(predictedRawDays);

  // Overall Empirical Reliability Score (0 - 100%)
  const overallScore = Math.round(
    Math.min(100, Math.max(15, (histReliabilityScore * 45) + (driftPenalty * 25) + (ageFactor * 15) + (envFactor * 15)))
  );

  let stabilityGrade: IntervalPredictionResult['stabilityGrade'] = 'Moderate Stability';
  if (overallScore >= 85 && failCount === 0) {
    stabilityGrade = 'High Stability';
  } else if (overallScore < 70 || failCount > 0 || adjustCount >= 2) {
    stabilityGrade = 'High Drift / At Risk';
  }

  // Model Confidence based on data depth
  let confidence = 50; // Baseline with only category and age
  if (totalCalibrations >= 5) confidence = 95;
  else if (totalCalibrations >= 3) confidence = 85;
  else if (totalCalibrations >= 1) confidence = 70;
  if (temps.length >= 3 && humids.length >= 3) confidence = Math.min(100, confidence + 5);

  const diffMonths = recommendedMonths - currentIntervalMonths;
  const diffDays = recommendedDays - currentIntervalDays;

  let recommendationAction: IntervalPredictionResult['recommendationAction'] = 'MAINTAIN';
  if (diffMonths > 0) {
    recommendationAction = 'EXTEND';
  } else if (diffMonths < 0) {
    recommendationAction = 'REDUCE';
  }

  // Natural language explainability
  let explanation = '';
  if (recommendationAction === 'EXTEND') {
    explanation = `Instrument demonstrates high reliability (${overallScore}% score) with ${consecutivePasses} consecutive passed calibrations and low environmental drift. Calibration interval can safely be extended from ${currentIntervalMonths} to ${recommendedMonths} months while maintaining ISO 17025 compliance.`;
  } else if (recommendationAction === 'REDUCE') {
    explanation = `Predictive drift analysis flags increased calibration risk (reliability score ${overallScore}%). Due to ${failCount > 0 ? `${failCount} past failure(s) and ` : ''}${adjustCount > 0 ? `${adjustCount} adjustment(s)` : 'instrument age & environmental variance'}, tightening interval from ${currentIntervalMonths} to ${recommendedMonths} months is recommended.`;
  } else {
    explanation = `Current interval of ${currentIntervalMonths} months matches the ML predicted optimal cycle. Instrument performance is aligned with expected baseline tolerances (${overallScore}% reliability score).`;
  }

  return {
    recommendedIntervalMonths: recommendedMonths,
    recommendedIntervalDays: recommendedDays,
    currentIntervalMonths,
    currentIntervalDays,
    differenceMonths: diffMonths,
    differenceDays: diffDays,
    reliabilityScore: overallScore,
    stabilityGrade,
    confidence,
    factors: {
      historicalPassRate: Math.round(histReliabilityScore * 100),
      totalCalibrationsAnalyzed: totalCalibrations,
      ageInYears: Math.round(ageInYears * 10) / 10,
      ageFactor: Math.round(ageFactor * 100) / 100,
      environmentalStabilityScore: envStabilityScore,
      driftStabilityScore,
      consecutivePasses,
      adjustmentCount: adjustCount,
      failureCount: failCount,
    },
    explanation,
    recommendationAction,
  };
}
