import type { DailyRecord } from "../types";
import { todayISO } from "./date";

export interface ForecastResult {
  dates: string[];
  values: (number | null)[];
  usedRecords: DailyRecord[];
  totalSold: number;
  averageSales: number | null;
  recommended: number | null;
  eligibleDays: number;
}

/** One shared restaurant window. Missing dish records never pull in older dates. */
export function recentRecordedDates(records: DailyRecord[], through = todayISO()): string[] {
  return [...new Set(records.filter(r => r.wasOffered && r.date <= through && Number.isFinite(r.sold)).map(r => r.date))].sort().slice(-5);
}
export function saleForDate(records: DailyRecord[], dishId: string, date: string): DailyRecord | undefined {
  return records.find(r => r.dishId === dishId && r.date === date && r.wasOffered);
}
export function computeForecast(records: DailyRecord[], dishId: string, dates = recentRecordedDates(records)): ForecastResult {
  const usedRecords = dates.flatMap(date => {const record = saleForDate(records,dishId,date); return record ? [record] : [];});
  const values = dates.map(date => saleForDate(records,dishId,date)?.sold ?? null);
  const totalSold = usedRecords.reduce((sum,r) => sum+r.sold,0);
  const averageSales = usedRecords.length ? totalSold/usedRecords.length : null;
  return {dates,values,usedRecords,totalSold,averageSales,recommended:averageSales === null ? null : Math.round(averageSales),eligibleDays:usedRecords.length};
}
