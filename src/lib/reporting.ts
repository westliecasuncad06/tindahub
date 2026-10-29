import type { AppData } from "./types.ts";
import { businessDate } from "./dates.ts";
import { lineCents } from "./money.ts";
export type ReportKind =
  | "inventory"
  | "movements"
  | "low-stock"
  | "sales"
  | "profit"
  | "counts"
  | "expenses";
export type ReportTable = {
  headers: string[];
  rows: (string | number | null)[][];
};
const sum = (values: number[]) =>
  values.reduce((s, n) => s + Math.round(n * 100), 0) / 100;
export const inRange = (date: string, from: string, to: string) =>
  date >= from && date <= to;
export function summarize(data: AppData, from: string, to: string) {
  const sales = data.sales.filter(
    (s) =>
      s.status === "completed" &&
      inRange(businessDate(new Date(s.created_at)), from, to),
  );
  const expenses = sum(
    data.expenses
      .filter((e) => inRange(e.expense_date, from, to))
      .map((e) => e.amount),
  );
  const revenue = sum(sales.map((s) => s.total)),
    profit = sum(sales.map((s) => s.profit_total));
  return {
    sales: revenue,
    cost: sum(sales.map((s) => s.cogs_total)),
    profit,
    expenses,
    net: Math.round((profit - expenses) * 100) / 100,
    count: sales.length,
    average: sales.length
      ? Math.round((revenue / sales.length) * 100) / 100
      : 0,
  };
}
export function reportTable(
  data: AppData,
  kind: ReportKind,
  from: string,
  to: string,
): ReportTable {
  const products = new Map(data.products.map((p) => [p.id, p]));
  if (kind === "inventory")
    return {
      headers: [
        "Product",
        "SKU",
        "Category",
        "Stock",
        "Unit",
        "Cost price",
        "Selling price",
        "Margin %",
        "Stock cost value",
      ],
      rows: data.products
        .filter((p) => p.is_active)
        .map((p) => [
          p.name,
          p.sku,
          data.categories.find((c) => c.id === p.category_id)?.name ?? "",
          p.stock_qty,
          p.unit,
          p.cost_price,
          p.selling_price,
          p.selling_price
            ? Math.round(
                ((p.selling_price - p.cost_price) / p.selling_price) * 1000,
              ) / 10
            : 0,
          lineCents(p.cost_price, p.stock_qty) / 100,
        ]),
    };
  if (kind === "low-stock")
    return {
      headers: [
        "Product",
        "Stock",
        "Reorder level",
        "Suggested quantity",
        "Estimated cost",
      ],
      rows: data.products
        .filter((p) => p.is_active && p.stock_qty <= p.reorder_level)
        .map((p) => {
          const q = Math.max(0, p.reorder_level * 2 - p.stock_qty);
          return [
            p.name,
            p.stock_qty,
            p.reorder_level,
            q,
            Math.round(q * p.cost_price * 100) / 100,
          ];
        }),
    };
  if (kind === "movements" || kind === "counts")
    return {
      headers: [
        "Date",
        "Product",
        "Type",
        "Quantity change",
        "Quantity after",
        "Unit cost",
        "Reason",
      ],
      rows: data.movements
        .filter(
          (m) =>
            (kind !== "counts" || m.type === "count") &&
            inRange(businessDate(new Date(m.created_at)), from, to),
        )
        .map((m) => [
          businessDate(new Date(m.created_at)),
          products.get(m.product_id)?.name ?? "Archived product",
          m.type,
          m.qty_change,
          m.qty_after,
          m.unit_cost,
          m.reason,
        ]),
    };
  if (kind === "sales")
    return {
      headers: [
        "Date",
        "Receipt",
        "Status",
        "Payment",
        "Total",
        "Cost",
        "Profit",
        "Cash received",
        "Change",
      ],
      rows: data.sales
        .filter((s) => inRange(businessDate(new Date(s.created_at)), from, to))
        .map((s) => [
          businessDate(new Date(s.created_at)),
          s.receipt_no,
          s.status,
          s.is_credit ? "Credit" : "Cash",
          s.total,
          s.cogs_total,
          s.profit_total,
          s.cash_received,
          s.change_given,
        ]),
    };
  if (kind === "expenses")
    return {
      headers: [
        "Date",
        "Category",
        "Description",
        "Amount",
        "From cash drawer",
      ],
      rows: data.expenses
        .filter((e) => inRange(e.expense_date, from, to))
        .map((e) => [
          e.expense_date,
          e.category,
          e.description,
          e.amount,
          e.from_drawer ? "Yes" : "No",
        ]),
    };
  const days = new Set([
    ...data.sales.map((s) => businessDate(new Date(s.created_at))),
    ...data.expenses.map((e) => e.expense_date),
  ]);
  return {
    headers: [
      "Date",
      "Sales",
      "Cost of goods",
      "Gross profit",
      "Expenses",
      "Net profit",
    ],
    rows: [...days]
      .filter((d) => inRange(d, from, to))
      .sort()
      .map((day) => {
        const s = summarize(data, day, day);
        return [day, s.sales, s.cost, s.profit, s.expenses, s.net];
      }),
  };
}
