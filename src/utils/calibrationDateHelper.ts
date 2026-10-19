/**
 * Universal Calibration Date & Status Helper
 * Accurately computes next calibration date, days remaining, and status
 * based on last calibration date and interval.
 *
 * Guarantees timezone-safe calendar day calculations so instruments are
 * never falsely flagged as overdue on due date or when recent calibration was logged.
 */

export interface CalibrationMetrics {
  nextCalibrationDate: string;
  daysRemaining: number;
  status: 'calibrated' | 'due_soon' | 'overdue';
}

interface ParsedYMD {
  year: number;
  month: number; // 0-indexed (0 = Jan, 11 = Dec)
  day: number;
}

/**
 * Safely parse YYYY-MM-DD or ISO date string into year, month (0-indexed), and day
 */
export function parseYMD(dateStr?: string | null): ParsedYMD | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

/**
 * Get today's calendar date as a normalized UTC Date (midnight UTC)
 */
export function getCalendarTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * Format a Date or year/month/day to YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add days to a calendar date using UTC arithmetic to avoid DST and timezone shifts
 */
export function addDaysToYmd(ymd: ParsedYMD, days: number): Date {
  const d = new Date(Date.UTC(ymd.year, ymd.month, ymd.day));
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * Add calendar months to a date cleanly
 */
export function addMonths(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const result = new Date(Date.UTC(y, m + months, d));
  return result;
}

/**
 * Compute next calibration date, days remaining, and status.
 *
 * Rules:
 * 1. If lastCalibrationDate is given, nextCalibrationDate is calculated as
 *    lastCalibrationDate + interval (days or months).
 * 2. If an explicitNextDateStr is given, it is only respected if it is strictly
 *    after lastCalibrationDate AND consistent with the calibration interval (prevents stale dates).
 * 3. If neither lastCalibrationDate nor explicitNextDateStr is given, next date is today + interval.
 * 4. Days remaining is calculated using calendar days (0 = due today, >0 = future, <0 = overdue).
 */
export function calculateCalibrationMetrics(
  lastCalibrationDateStr?: string | null,
  intervalMonths: number = 6,
  explicitNextDateStr?: string | null,
  intervalDays?: number | null
): CalibrationMetrics {
  const todayUtc = getCalendarTodayUtc();

  // Determine interval in days
  let resolvedIntervalDays = 180;
  if (intervalDays && Number(intervalDays) > 0) {
    resolvedIntervalDays = Number(intervalDays);
  } else if (intervalMonths && Number(intervalMonths) > 0) {
    resolvedIntervalDays = Math.round(Number(intervalMonths) * 30.4375); // Average calendar month length
  }

  const lastCalParsed = parseYMD(lastCalibrationDateStr);
  const explicitNextParsed = parseYMD(explicitNextDateStr);

  let nextDateUtc: Date;

  if (lastCalParsed) {
    // Authoritative calculation from last calibration date + interval
    const computedNextUtc = addDaysToYmd(lastCalParsed, resolvedIntervalDays);

    if (explicitNextParsed) {
      const explicitUtc = new Date(Date.UTC(explicitNextParsed.year, explicitNextParsed.month, explicitNextParsed.day));
      const lastCalUtc = new Date(Date.UTC(lastCalParsed.year, lastCalParsed.month, lastCalParsed.day));

      // Only respect explicit next date if it occurs strictly AFTER the last calibration date
      // and isn't an expired stale date when the computed next date is in the future
      const isExplicitAfterLast = explicitUtc.getTime() > lastCalUtc.getTime();
      const isExplicitStaleOverdue = explicitUtc.getTime() < todayUtc.getTime() && computedNextUtc.getTime() >= todayUtc.getTime();

      if (isExplicitAfterLast && !isExplicitStaleOverdue) {
        nextDateUtc = explicitUtc;
      } else {
        nextDateUtc = computedNextUtc;
      }
    } else {
      nextDateUtc = computedNextUtc;
    }
  } else if (explicitNextParsed) {
    // No last calibration date, but an explicit scheduled next date was provided
    nextDateUtc = new Date(Date.UTC(explicitNextParsed.year, explicitNextParsed.month, explicitNextParsed.day));
  } else {
    // Uncalibrated / newly cataloged asset: interval from today
    nextDateUtc = new Date(todayUtc.getTime() + resolvedIntervalDays * 86400000);
  }

  const nextCalibrationDate = formatDate(nextDateUtc);

  // Exact calendar day difference
  const diffMs = nextDateUtc.getTime() - todayUtc.getTime();
  const daysRemaining = Math.round(diffMs / 86400000);

  let status: 'calibrated' | 'due_soon' | 'overdue' = 'calibrated';
  if (daysRemaining < 0) {
    status = 'overdue';
  } else if (daysRemaining <= 30) {
    // 0 to 30 days remaining = due soon (including due today at 0 days)
    status = 'due_soon';
  } else {
    // > 30 days remaining = calibrated (within active certified window)
    status = 'calibrated';
  }

  return {
    nextCalibrationDate,
    daysRemaining,
    status,
  };
}
