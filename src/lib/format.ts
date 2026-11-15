const PHP = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const PHP_PRECISE = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const NUM = new Intl.NumberFormat("en-PH");

export function peso(value: number): string {
  return PHP.format(value);
}

export function pesoPrecise(value: number): string {
  return PHP_PRECISE.format(value);
}

export function num(value: number): string {
  return NUM.format(value);
}

/** "46 servings" / "1 serving" / "3 plates" */
export function pluralize(count: number, unit: string): string {
  const u = count === 1 ? unit : `${unit}s`;
  return `${num(count)} ${u}`;
}

export function unitLabel(count: number, unit: string): string {
  return count === 1 ? unit : `${unit}s`;
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function parseNumberInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return n;
}
