import test from "node:test";
import assert from "node:assert/strict";
import { createDemoData } from "../../src/lib/demo.ts";
import { summarize, reportTable } from "../../src/lib/reporting.ts";
test("inventory valuations use exact centavo rounding for fractional stock", () => {
  const data = createDemoData(new Date("2026-10-29T04:00:00Z"));
  data.products = [{ ...data.products[0], stock_qty: 0.5, cost_price: 0.29 }];
  assert.equal(
    reportTable(data, "inventory", "2026-10-29", "2026-10-29").rows[0].at(-1),
    0.15,
  );
});
test("report totals exclude voids and include expense-only days", () => {
  const data = createDemoData(new Date("2026-10-29T04:00:00Z"));
  data.sales = [
    {
      ...data.sales[0],
      id: "a",
      created_at: "2026-10-29T04:00:00Z",
      subtotal: 100,
      discount: 10,
      total: 90,
      cogs_total: 50,
      profit_total: 40,
      status: "completed",
    },
    {
      ...data.sales[0],
      id: "b",
      created_at: "2026-10-29T04:00:00Z",
      total: 500,
      profit_total: 400,
      status: "voided",
    },
  ];
  data.expenses = [
    { ...data.expenses[0], amount: 15, expense_date: "2026-10-29" },
    { ...data.expenses[0], id: "x", amount: 5, expense_date: "2026-10-28" },
  ];
  const summary = summarize(data, "2026-10-28", "2026-10-29");
  assert.equal(summary.sales, 90);
  assert.equal(summary.profit, 40);
  assert.equal(summary.expenses, 20);
  assert.equal(summary.net, 20);
  assert.equal(summary.count, 1);
  const table = reportTable(data, "profit", "2026-10-28", "2026-10-29");
  assert.equal(table.rows.length, 2);
  assert.equal(table.rows[0].at(-1), -5);
});
