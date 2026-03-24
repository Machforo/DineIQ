import { parse, isValid, format } from "date-fns";

/**
 * Safely parse a price value that may contain thousands-separator commas.
 * e.g. "1,200" → 1200,  1200 → 1200,  "" → 0,  undefined → 0
 */
export const parsePrice = (val: any): number => {
  if (val === undefined || val === null || val === "") return 0;
  const cleaned = String(val).replace(/,/g, "");
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
};

/**
 * Formats a date or string into "dd/MM/yyyy, hh:mm:ss AM/PM" (single line)
 */
export const formatDateTime = (val: any): string => {
  const d = parseToDate(val);
  if (!d) return String(val || "");
  // Using date-fns format for total control
  return format(d, "dd/MM/yyyy, hh:mm:ss a").toUpperCase();
};

/**
 * Robustly parse any date string into a Date object
 */
export const parseToDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return val;

  const cleanVal = String(val).replace(/^['"]+|['"]+$/g, "").trim();
  const formats = [
    "dd/MM/yyyy HH:mm:ss",
    "dd/MM/yyyy HH:mm",
    "dd/MM/yyyy",
    "MM/dd/yyyy HH:mm:ss",
    "MM/dd/yyyy",
    "yyyy-MM-dd HH:mm:ss",
    "yyyy-MM-dd HH:mm",
    "yyyy-MM-dd",
  ];

  const now = new Date();
  for (const fmt of formats) {
    const parsed = parse(cleanVal, fmt, now);
    if (isValid(parsed)) return parsed;
  }

  const native = new Date(cleanVal);
  return isValid(native) ? native : null;
};

export function parseFlexibleDate(val: any): string {
  const d = parseToDate(val);
  return d ? formatDateTime(d) : String(val || "");
}
