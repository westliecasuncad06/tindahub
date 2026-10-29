import { ensure } from "./validation.ts";

const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" });
export function businessDate(date = new Date()): string {
  ensure(Number.isFinite(date.getTime()), "invalid_date", "Invalid business date.");
  const parts = formatter.formatToParts(date);
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)!.value).join("-");
}
