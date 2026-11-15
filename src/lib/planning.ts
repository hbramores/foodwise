import type { DailyRecord, Dish } from "../types";

export function historyLabel(usedDays: number): string | null {
  if (usedDays < 3) return null;
  if (usedDays < 5) return "Limited History";
  if (usedDays < 10) return "Growing History";
  return "More History";
}

export function preparationTarget(base: number | null, adjustment: number): number | null {
  return base === null ? null : Math.max(0, base + adjustment);
}

export function productionInsights(records: DailyRecord[], dishes: Dish[]): string[] {
  const offered = records.filter((r): r is DailyRecord & {prepared: number} => r.wasOffered && r.prepared !== null);
  const dates = new Set(offered.map(r => r.date));
  if (dates.size < 3) return [];
  const grouped = new Map<string, (DailyRecord & {prepared: number})[]>();
  for (const r of offered) grouped.set(r.dishId, [...(grouped.get(r.dishId) ?? []), r]);
  const frequent = [...grouped.entries()].filter(([, rows]) => rows.length >= 3)
    .map(([id, rows]) => ({id, rows, count: rows.filter(r => r.prepared > r.sold).length}))
    .sort((a,b) => b.count / b.rows.length - a.count / a.rows.length)[0];
  const insights: string[] = [];
  if (frequent && frequent.count > 0) {
    const name = dishes.find(d => d.id === frequent.id)?.name ?? "A dish";
    insights.push(`${name} had unsold servings on ${frequent.count} of ${frequent.rows.length} recorded days in this selection.`);
  }
  const totalUnsold = offered.reduce((sum,r) => sum + Math.max(0, r.prepared-r.sold), 0);
  insights.push(`An average of ${(totalUnsold/dates.size).toLocaleString("en-PH", {maximumFractionDigits: 1})} servings remained unsold per recorded day across this selection.`);
  const daily = [...dates].map(date => offered.filter(r => r.date === date));
  const excessDays = daily.filter(rows => rows.reduce((sum,r) => sum+r.prepared-r.sold,0) > 0).length;
  insights.push(`Prepared quantities ${excessDays > dates.size/2 ? "exceeded sold quantities on most recorded days" : "exceeded sold quantities on " + excessDays + " of " + dates.size + " recorded days"} (${excessDays}/${dates.size}) in this selection.`);
  return insights;
}
