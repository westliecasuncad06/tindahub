export class DomainError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

export function ensure(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new DomainError(code, message);
}

/** Scale a decimal without accepting silent rounding or unsafe numeric ranges. */
export function scaled(value: unknown, places: 2 | 3, label: string, minimum = 0): number {
  ensure(typeof value === "number" && Number.isFinite(value), "invalid_number", label + " must be a finite number.");
  ensure(value >= minimum, "invalid_number", label + " must be at least " + minimum + ".");
  const digits = value.toString().split(".");
  ensure(!/[eE]/.test(value.toString()) && (digits[1]?.length ?? 0) <= places, "invalid_precision", label + " has too many decimal places.");
  const result = Math.round(value * 10 ** places);
  ensure(Number.isSafeInteger(result) && Math.abs(result) <= 999_999_999_999, "invalid_range", label + " exceeds the database limit.");
  return result;
}

export const cents = (value: unknown, label = "Amount") => scaled(value, 2, label);
export const mills = (value: unknown, label = "Quantity") => scaled(value, 3, label);

export function text(value: unknown, label: string, max = 255, required = false): string {
  ensure(value === undefined || value === null || typeof value === "string", "invalid_text", label + " must be text.");
  const result = typeof value === "string" ? value.trim() : "";
  ensure(result.length <= max && (!required || result.length > 0), "invalid_text", label + " is required and must be at most " + max + " characters.");
  return result;
}

export function boolean(value: unknown, fallback = false): boolean {
  if (value === undefined) return fallback;
  ensure(typeof value === "boolean", "invalid_boolean", "Expected a boolean value.");
  return value;
}

export function calendarDate(value: unknown, optional = false): string | null {
  if (optional && (value === undefined || value === null || value === "")) return null;
  ensure(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value), "invalid_date", "Date must use YYYY-MM-DD.");
  const parsed = new Date(value + "T00:00:00Z");
  ensure(Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value, "invalid_date", "Date does not exist.");
  return value;
}

export function rows(value: unknown, label: string): Record<string, unknown>[] {
  ensure(Array.isArray(value) && value.length > 0 && value.length <= 1000, "invalid_items", label + " must contain 1–1000 items.");
  for (const row of value) ensure(row && typeof row === "object" && !Array.isArray(row), "invalid_items", label + " contains an invalid item.");
  return value;
}

/** Canonical JSON makes a retried command independent of object-key order. */
export function canonical(value: unknown, depth = 0): string {
  ensure(depth <= 16, "invalid_request", "Request is too deeply nested.");
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    ensure(Number.isFinite(value), "invalid_request", "Request contains an invalid number.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    ensure(value.length <= 1000, "invalid_request", "Request contains too many items.");
    return "[" + value.map((item) => canonical(item, depth + 1)).join(",") + "]";
  }
  ensure(value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype, "invalid_request", "Request must contain JSON values only.");
  return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical((value as Record<string, unknown>)[key], depth + 1)).join(",") + "}";
}
