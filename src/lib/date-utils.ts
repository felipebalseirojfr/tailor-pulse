/**
 * Date utilities to handle Postgres DATE columns (YYYY-MM-DD) without timezone shifts.
 *
 * Why: `new Date("2025-05-12")` is parsed as UTC midnight. In Brazil (UTC-3) that
 * becomes 2025-05-11 21:00 local, which silently shifts the day by one. All date-only
 * strings coming from the database MUST be parsed as LOCAL midnight.
 */

/** Parse a value into a local-midnight Date. Accepts Date, ISO timestamp, or YYYY-MM-DD. */
export function parseLocalDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  // YYYY-MM-DD (date-only) → treat as local midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }
  // Full ISO timestamp → let Date parse normally
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Convert a Date to local YYYY-MM-DD (no timezone conversion). */
export function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today at local midnight. */
export function todayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Whole days between two dates (b - a), normalized to local midnight. */
export function diffDays(a: Date, b: Date): number {
  const x = new Date(a); x.setHours(0, 0, 0, 0);
  const y = new Date(b); y.setHours(0, 0, 0, 0);
  return Math.round((y.getTime() - x.getTime()) / 86_400_000);
}
