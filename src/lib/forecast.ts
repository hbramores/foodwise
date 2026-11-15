import type { DailyRecord, ForecastSettings } from "../types";
import { MIN_ELIGIBLE_DAYS } from "../types";

export interface ForecastResult {
  eligibleDays: number;
  totalEligibleDays: number;
  /** Most recent eligible records, newest first, limited to the period window. */
  usedRecords: DailyRecord[];
  totalSold: number;
  totalPrepared: number;
  averageSales: number;
  averagePrepared: number;
  recommended: number | null;
  averagePreparedCeil: number | null;
  potentialReduction: number | null;
  hasEnoughData: boolean;
}

function byDateDesc(a: DailyRecord, b: DailyRecord): number {
  if (a.date === b.date) return 0;
  return a.date < b.date ? 1 : -1;
}

/**
 * Records eligible for a forecast dated `forecastDate`:
 *  - the dish was offered (wasOffered === true)
 *  - the record date is strictly before the forecast date
 *  - newest first
 */
export function eligibleRecords(
  records: DailyRecord[],
  forecastDate: string
): DailyRecord[] {
  return records
    .filter((r) => r.wasOffered && r.date < forecastDate)
    .sort(byDateDesc);
}

export function computeForecast(
  records: DailyRecord[],
  settings: ForecastSettings,
  forecastDate: string
): ForecastResult {
  const eligible = eligibleRecords(records, forecastDate);
  const used = eligible.slice(0, settings.historicalPeriod);
  const count = used.length;

  const totalSold = used.reduce((s, r) => s + r.sold, 0);
  const totalPrepared = used.reduce((s, r) => s + r.prepared, 0);
  const averageSales = count > 0 ? totalSold / count : 0;
  const averagePrepared = count > 0 ? totalPrepared / count : 0;

  const hasEnoughData = count >= MIN_ELIGIBLE_DAYS;
  const recommended = hasEnoughData
    ? Math.ceil(averageSales * (1 + settings.safetyAllowance))
    : null;
  const averagePreparedCeil = count > 0 ? Math.ceil(averagePrepared) : null;

  const potentialReduction =
    recommended !== null && averagePreparedCeil !== null
      ? Math.max(0, averagePreparedCeil - recommended)
      : null;

  return {
    eligibleDays: count,
    totalEligibleDays: eligible.length,
    usedRecords: used,
    totalSold,
    totalPrepared,
    averageSales,
    averagePrepared,
    recommended,
    averagePreparedCeil,
    potentialReduction,
    hasEnoughData,
  };
}

export function unsold(prepared: number, sold: number): number {
  return prepared - sold;
}

export function retained(
  prepared: number,
  sold: number,
  discarded: number
): number {
  return prepared - sold - discarded;
}

/** Estimated avoidable preparation cost, or null when no usable cost exists. */
export function estimatedAvoidableCost(
  potentialReduction: number | null,
  costPerServing: number | null
): number | null {
  if (potentialReduction === null || potentialReduction <= 0) return null;
  if (costPerServing === null || !Number.isFinite(costPerServing) || costPerServing <= 0) {
    return null;
  }
  return potentialReduction * costPerServing;
}
