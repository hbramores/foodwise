import type { Unit } from "../types";

/**
 * Recipe quantities use small units (g, mL) while stock is held in larger
 * ones (kg, L), so every deduction converts into the ingredient's own unit.
 */
const GROUPS: Record<Unit, { base: string; factor: number }> = {
  kg: { base: "g", factor: 1000 },
  g: { base: "g", factor: 1 },
  L: { base: "mL", factor: 1000 },
  mL: { base: "mL", factor: 1 },
  pcs: { base: "pcs", factor: 1 },
};

/** Converts a quantity between compatible units. Null when incompatible. */
export function convertQty(qty: number, from: Unit, to: Unit): number | null {
  const a = GROUPS[from];
  const b = GROUPS[to];
  if (!a || !b || a.base !== b.base) return null;
  return (qty * a.factor) / b.factor;
}

/** Rounds to 3 decimals — enough for grams/litres without float noise. */
export function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Human label such as "1.5 kg" / "0.25 pcs". */
export function qtyLabel(value: number): string {
  const rounded = round3(value);
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return text;
}
