/** Local-date helpers. Everything is keyed on local calendar days (YYYY-MM-DD). */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const LONG_FMT: Intl.DateTimeFormatOptions = {
  weekday: "long",
  month: "long",
  day: "numeric",
};

const MEDIUM_FMT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
};

const SHORT_FMT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
};

export function formatLong(iso: string): string {
  return fromISODate(iso).toLocaleDateString("en-PH", LONG_FMT);
}

export function formatMedium(iso: string): string {
  return fromISODate(iso).toLocaleDateString("en-PH", MEDIUM_FMT);
}

export function formatShort(iso: string): string {
  return fromISODate(iso).toLocaleDateString("en-PH", SHORT_FMT);
}

/** Compact numeric date, e.g. "11/10" — used in narrow mobile table columns. */
export function formatCompact(iso: string): string {
  const d = fromISODate(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatLongDateObj(d: Date): string {
  return d.toLocaleDateString("en-PH", LONG_FMT);
}

/** "Today" / "Yesterday" / formatted medium date. */
export function relativeDayLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return "Today";
  if (iso === addDaysISO(today, -1)) return "Yesterday";
  if (iso === addDaysISO(today, 1)) return "Tomorrow";
  return formatMedium(iso);
}

export function isBefore(a: string, b: string): boolean {
  return a < b;
}

export function isAfter(a: string, b: string): boolean {
  return a > b;
}

/* ------------------------------------------------- Asia/Manila (PRD §3.3) */

export const MANILA_TZ = "Asia/Manila";

const MANILA_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: MANILA_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const MANILA_STAMP = new Intl.DateTimeFormat("en-PH", {
  timeZone: MANILA_TZ,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const MANILA_CLOCK = new Intl.DateTimeFormat("en-PH", {
  timeZone: MANILA_TZ,
  hour: "numeric",
  minute: "2-digit",
});

/** Today's operating date in Asia/Manila, as YYYY-MM-DD. */
export function manilaToday(): string {
  return MANILA_DAY.format(new Date());
}

/** "Nov 16, 2026, 10:24 AM" in Asia/Manila. */
export function manilaStamp(iso: string): string {
  return MANILA_STAMP.format(new Date(iso));
}

/** "10:24 AM" in Asia/Manila. */
export function manilaTime(iso: string): string {
  return MANILA_CLOCK.format(new Date(iso));
}

/** Monday of the week containing `iso`. */
export function weekStartISO(iso: string): string {
  const d = fromISODate(iso);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return toISODate(d);
}

/** First day of the month containing `iso`. */
export function monthStartISO(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** The `n` dates ending at (and including) `iso`, oldest first. */
export function lastNDates(iso: string, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) out.push(addDaysISO(iso, -i));
  return out;
}
