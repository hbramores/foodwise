import {
  FORECAST_WINDOW,
  type AppData,
  type ClosingLineItem,
  type Ingredient,
  type MenuProduct,
  type RecipeItem,
} from "../types";
import { convertQty, round3 } from "./units";
import { manilaToday, monthStartISO, weekStartISO } from "./date";

/* ------------------------------------------------------------------ periods */

export type PeriodKey = "today" | "week" | "month";

export const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

export interface PeriodRange {
  from: string;
  to: string;
}

export function periodRange(period: PeriodKey, today = manilaToday()): PeriodRange {
  if (period === "today") return { from: today, to: today };
  if (period === "week") return { from: weekStartISO(today), to: today };
  return { from: monthStartISO(today), to: today };
}

export function inRange(date: string, range: PeriodRange): boolean {
  return date >= range.from && date <= range.to;
}

/* --------------------------------------------------------------- inventory */

export function recipeOf(data: AppData, productId: string): RecipeItem[] {
  return data.recipes.filter((r) => r.productId === productId);
}

export interface RequirementLine {
  ingredient: Ingredient;
  qty: number;
  available: number;
  ok: boolean;
}

/** Ingredient requirement for preparing `servings` of a product. */
export function requirementFor(
  data: AppData,
  productId: string,
  servings: number
): RequirementLine[] {
  const out: RequirementLine[] = [];
  for (const item of recipeOf(data, productId)) {
    const ingredient = data.ingredients.find((i) => i.id === item.ingredientId);
    if (!ingredient) continue;
    const qty = convertQty(item.qty * servings, item.unit, ingredient.unit);
    if (qty === null) continue;
    const need = round3(qty);
    out.push({ ingredient, qty: need, available: ingredient.stock, ok: ingredient.stock >= need });
  }
  return out;
}

/* --------------------------------------------------------------- offerings */

/** Completed (non-voided) quantities for one product inside a range. */
export function soldQty(data: AppData, productId: string, range: PeriodRange): number {
  let total = 0;
  for (const txn of data.transactions) {
    if (txn.status !== "completed" || !inRange(txn.date, range)) continue;
    for (const line of txn.items) if (line.productId === productId) total += line.qty;
  }
  return total;
}

export function soldQtyOn(data: AppData, productId: string, date: string): number {
  return soldQty(data, productId, { from: date, to: date });
}

export function preparedQty(data: AppData, productId: string, range: PeriodRange): number {
  return data.batches
    .filter((b) => b.productId === productId && inRange(b.date, range))
    .reduce((sum, b) => sum + b.servings, 0);
}

export function discardedQty(data: AppData, productId: string, range: PeriodRange): number {
  let total = 0;
  for (const closing of data.closings) {
    if (!inRange(closing.date, range)) continue;
    for (const line of closing.lines) {
      if (line.productId === productId) total += line.discarded;
    }
  }
  return total;
}

/**
 * Servings that can actually be sold right now.
 *
 * Only the current operating day counts. A forecast recommendation never
 * creates stock, nothing is sellable until a preparation batch is confirmed,
 * and a wrapped-up day has nothing left. Keeping the scope to one day also
 * means closed-day quantities can never leak back in from stale stored data.
 */
export function availableServings(
  data: AppData,
  productId: string,
  date = manilaToday()
): number {
  const day = data.days.find((d) => d.date === date);
  if (day?.status === "closed") return 0;

  const prepared = data.batches
    .filter((b) => b.productId === productId && b.date === date)
    .reduce((sum, b) => sum + b.servings, 0);
  const sold = soldQtyOn(data, productId, date);
  const discarded = discardedQty(data, productId, { from: date, to: date });
  return Math.max(0, prepared - sold - discarded);
}

/* --------------------------------------------------------------- forecasting */

export interface Forecast {
  productId: string;
  dates: string[];
  values: number[];
  total: number;
  validDays: number;
  average: number | null;
  recommended: number | null;
  prepared: number;
  sold: number;
}

/**
 * PRD §5.2 — the rolling window over the latest valid recorded operating
 * dates.
 *
 * A date counts when the dish had a completed sale, or when the operating day
 * was wrapped up (an explicit zero-sales day may count). Preparation is
 * deliberately excluded: typing or confirming prepared quantities must never
 * move the recommendation (PRD A4).
 */
export function forecastFor(data: AppData, productId: string): Forecast {
  const closedDates = new Set(data.days.filter((d) => d.status === "closed").map((d) => d.date));
  const soldDates = new Set<string>();
  for (const txn of data.transactions) {
    if (txn.status !== "completed") continue;
    if (txn.items.some((line) => line.productId === productId)) soldDates.add(txn.date);
  }

  const candidateDates = [...new Set(data.days.map((d) => d.date))].sort();
  const recorded = candidateDates.filter((date) => soldDates.has(date) || closedDates.has(date));

  const dates = recorded.slice(-FORECAST_WINDOW);
  const values = dates.map((date) => soldQtyOn(data, productId, date));
  const total = values.reduce((sum, v) => sum + v, 0);
  const average = dates.length ? total / dates.length : null;

  return {
    productId,
    dates,
    values,
    total,
    validDays: dates.length,
    average,
    recommended: average === null ? null : Math.round(average),
    prepared: preparedQty(data, productId, { from: dates[0] ?? manilaToday(), to: manilaToday() }),
    sold: total,
  };
}

/* -------------------------------------------------------------------- KPIs */

export interface DashboardKpis {
  sales: number;
  orders: number;
  prepared: number;
  sold: number;
}

export function kpis(data: AppData, range: PeriodRange): DashboardKpis {
  let sales = 0;
  let orders = 0;
  let sold = 0;
  for (const txn of data.transactions) {
    if (txn.status !== "completed" || !inRange(txn.date, range)) continue;
    sales += txn.total;
    orders += 1;
    sold += txn.items.reduce((sum, l) => sum + l.qty, 0);
  }
  const prepared = data.batches
    .filter((b) => inRange(b.date, range))
    .reduce((sum, b) => sum + b.servings, 0);
  return { sales, orders, prepared, sold };
}

export interface WasteSummary {
  discarded: number;
  prepared: number;
  closedDays: number;
  perClosedDay: number;
  rate: number | null;
  unreconciled: number;
}

export function wasteSummary(data: AppData, range: PeriodRange): WasteSummary {
  let discarded = 0;
  let unreconciled = 0;
  let closedDays = 0;

  for (const closing of data.closings) {
    if (!inRange(closing.date, range)) continue;
    closedDays += 1;
    for (const line of closing.lines) {
      discarded += line.discarded;
      unreconciled += line.remaining - (line.discarded + line.carriedOver + line.other);
    }
  }

  const prepared = data.batches
    .filter((b) => inRange(b.date, range))
    .reduce((sum, b) => sum + b.servings, 0);

  return {
    discarded,
    prepared,
    closedDays,
    perClosedDay: closedDays ? round3(discarded / closedDays) : 0,
    rate: prepared > 0 ? discarded / prepared : null,
    unreconciled: Math.abs(unreconciled) < 0.0001 ? 0 : unreconciled,
  };
}

/* ------------------------------------------------------------------ stock */

export interface StockState {
  out: Ingredient[];
  low: Ingredient[];
  normal: Ingredient[];
  active: Ingredient[];
}

export function stockState(data: AppData): StockState {
  const active = data.ingredients.filter((i) => i.status === "active");
  const out: Ingredient[] = [];
  const low: Ingredient[] = [];
  const normal: Ingredient[] = [];
  for (const ingredient of active) {
    if (ingredient.stock <= 0) out.push(ingredient);
    else if (ingredient.stock <= ingredient.lowThreshold) low.push(ingredient);
    else normal.push(ingredient);
  }
  const byUrgency = (a: Ingredient, b: Ingredient) =>
    a.stock / (a.lowThreshold || 1) - b.stock / (b.lowThreshold || 1);
  out.sort(byUrgency);
  low.sort(byUrgency);
  return { out, low, normal, active };
}

export type StockLevel = "out" | "low" | "normal";

export function stockLevel(ingredient: Ingredient): StockLevel {
  if (ingredient.stock <= 0) return "out";
  if (ingredient.stock <= ingredient.lowThreshold) return "low";
  return "normal";
}

/* --------------------------------------------------------------- insights */

export interface Insight {
  id: string;
  tone: "warn" | "info" | "good";
  text: string;
}

/** Predefined, condition-based recommendations (PRD §3.8). No live AI. */
export function insights(data: AppData, range: PeriodRange): Insight[] {
  const out: Insight[] = [];
  const stock = stockState(data);

  if (stock.out.length) {
    out.push({
      id: "out",
      tone: "warn",
      text: `${stock.out.length} ingredient${stock.out.length === 1 ? " is" : "s are"} out of stock. Restock before the next preparation cycle.`,
    });
  } else if (stock.low.length) {
    out.push({
      id: "low",
      tone: "warn",
      text: `${stock.low.length} ingredient${stock.low.length === 1 ? " is" : "s are"} running low. Restock before the next preparation cycle.`,
    });
  }

  for (const product of data.products.filter((p) => p.status === "active")) {
    const prepared = preparedQty(data, product.id, range);
    const sold = soldQty(data, product.id, range);
    if (prepared >= 10 && sold < prepared * 0.55) {
      out.push({
        id: `over-${product.id}`,
        tone: "warn",
        text: `Prepare fewer servings of ${product.name} — ${prepared - sold} of ${prepared} prepared servings went unsold.`,
      });
    } else if (prepared > 0 && sold >= prepared * 0.9) {
      out.push({
        id: `popular-${product.id}`,
        tone: "info",
        text: `Review preparation quantities for ${product.name} — it has been selling out.`,
      });
    }
  }

  const shortHistory = data.products.filter(
    (p) => p.status === "active" && forecastFor(data, p.id).validDays < FORECAST_WINDOW
  );
  if (shortHistory.length) {
    out.push({
      id: "history",
      tone: "info",
      text: `Continue recording sales for ${shortHistory.length} dish${shortHistory.length === 1 ? "" : "es"} — forecasting needs ${FORECAST_WINDOW} recorded days.`,
    });
  }

  if (!out.length) {
    out.push({ id: "ok", tone: "good", text: "Everything looks balanced. Keep recording sales to sharpen the forecasts." });
  }

  return out.slice(0, 4);
}

/* ------------------------------------------------------------------ closing */

export function closingFor(data: AppData, date: string) {
  return data.closings.find((c) => c.date === date);
}

export function dayFor(data: AppData, date: string) {
  return data.days.find((d) => d.date === date);
}

/** Opening carry-over for a date, taken from the previous closing. */
export function openingFor(data: AppData, productId: string, date: string): number {
  const previous = data.closings
    .filter((c) => c.date < date)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (!previous) return 0;
  return previous.lines.find((l) => l.productId === productId)?.carriedOver ?? 0;
}

export interface ClosingDraftLine extends ClosingLineItem {
  name: string;
  category: MenuProduct["category"];
}

/**
 * Live Wrap Up rows. Discarded is calculated, never typed:
 * Discarded = Prepared − Sold (PRD A7).
 */
export function closingDraft(data: AppData, date: string): ClosingDraftLine[] {
  return data.products
    .filter((p) => p.status === "active")
    .map((product) => {
      const prepared = data.batches
        .filter((b) => b.productId === product.id && b.date === date)
        .reduce((sum, b) => sum + b.servings, 0);
      const sold = soldQtyOn(data, product.id, date);
      const discarded = Math.max(0, prepared - sold);
      return {
        productId: product.id,
        name: product.name,
        category: product.category,
        opening: 0,
        prepared,
        sold,
        remaining: discarded,
        discarded,
        carriedOver: 0,
        other: 0,
      };
    });
}

/** Reconciliation is complete when every remaining serving is accounted for. */
export function reconciliationGap(line: ClosingLineItem): number {
  return round3(line.remaining - (line.discarded + line.carriedOver + line.other));
}

/* ----------------------------------------------------------------- receipts */

export function nextReceiptCode(data: AppData): string {
  const max = data.transactions.reduce((acc, t) => {
    const match = /^FW-(\d+)$/.exec(t.code);
    return match ? Math.max(acc, Number(match[1])) : acc;
  }, 0);
  return `FW-${String(max + 1).padStart(4, "0")}`;
}
