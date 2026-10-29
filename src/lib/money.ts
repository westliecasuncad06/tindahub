import { cents, ensure, mills } from "./validation.ts";

export function checkedCents(value: number): number {
  ensure(Number.isSafeInteger(value) && Math.abs(value) <= 999_999_999_999, "invalid_range", "Amount exceeds the database limit.");
  return value;
}

/** BigInt prevents large decimal quantity × price products losing centavos. */
export function lineCents(price: number, quantity: number): number {
  const result = (BigInt(cents(price, "Price")) * BigInt(mills(quantity)) + 500n) / 1000n;
  return checkedCents(Number(result));
}

const formatter = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", currencyDisplay: "narrowSymbol" });
export function money(value: number): string {
  ensure(Number.isFinite(value), "invalid_number", "Amount must be a finite number.");
  return formatter.format(value);
}
