import test from "node:test";
import assert from "node:assert/strict";
import { applyCommand, businessDate, calculateCart, money, toCSV } from "../../src/lib/domain.ts";
import { createDemoData } from "../../src/lib/demo.ts";
import type { Command } from "../../src/lib/types.ts";

const cmd = (type: Command["type"], payload: Command["payload"], id = crypto.randomUUID()): Command => ({ id, type, payload });
const fixture = () => {
  const data = createDemoData(new Date("2026-10-29T04:00:00Z"));
  data.sales = []; data.sale_items = []; data.debts = []; data.debt_payments = []; data.drawer = [];
  data.products[0].stock_qty = 4; data.products[0].selling_price = 13; data.products[0].cost_price = 10;
  data.movements = [{ id: "opening", product_id: data.products[0].id, type: "purchase", qty_change: 4, qty_after: 4, unit_cost: 10, reason: "Opening", created_at: "2026-10-29T04:00:00Z" }];
  return data;
};
test("combines duplicate product lines before checking available stock", () => {
  const d = fixture();
  assert.throws(() => calculateCart(d.products, [{ product_id: d.products[0].id, qty: 3 }, { product_id: d.products[0].id, qty: 2 }], 0), /stock/i);
});
test("calculates fractional quantities with centavo rounding", () => {
  const d = fixture(); d.products[0].selling_price = 12.35;
  const total = calculateCart(d.products, [{ product_id: d.products[0].id, qty: 1.125 }], 0.1);
  assert.equal(total.subtotal, 13.89); assert.equal(total.total, 13.79); assert.equal(money(13.79), "₱13.79");
});
test("rejects invalid discount and negative or nonfinite quantities", () => {
  const d = fixture(); const id = d.products[0].id;
  for (const qty of [-1, 0, NaN, Infinity, 0.0001]) assert.throws(() => calculateCart(d.products, [{ product_id: id, qty }], 0));
  assert.throws(() => calculateCart(d.products, [{ product_id: id, qty: 1 }], 14), /discount/i);
});
test("sale checkout is atomic and idempotent and void restores the ledger", () => {
  const d = fixture(); const id = d.products[0].id;
  assert.throws(() => applyCommand(d, cmd("sale.checkout", { items: [{ product_id: id, qty: 2 }], cash: 10 })), /payment/i);
  assert.equal(d.products[0].stock_qty, 4); assert.equal(d.sales.length, 0);
  const command = cmd("sale.checkout", { items: [{ product_id: id, qty: 2 }], cash: 50 });
  const sold = applyCommand(d, command);
  assert.equal(sold.products[0].stock_qty, 2); assert.equal(sold.sales[0].change_given, 24);
  assert.equal(sold.drawer[0].amount, 26); assert.equal(sold.sales[0].profit_total, 6);
  const twice = applyCommand(sold, command); assert.equal(twice.sales.length, 1); assert.equal(twice.movements.length, 2);
  assert.throws(() => applyCommand(sold, { ...command, payload: { ...command.payload, cash: 100 } }), /request/i);
  const restored = applyCommand(sold, cmd("sale.void", { sale_id: sold.sales[0].id, reason: "Mistake" }));
  assert.equal(restored.products[0].stock_qty, 4); assert.equal(restored.drawer.reduce((a, r) => a + r.amount, 0), 0);
  assert.equal(restored.movements.reduce((a, r) => a + r.qty_change, 0), 4);
  assert.throws(() => applyCommand(restored, cmd("sale.void", { sale_id: sold.sales[0].id, reason: "Again" })), /void/i);
});
test("credit checkout records only cash received and rejects overpayment and unsafe void", () => {
  const d = fixture();
  const sold = applyCommand(d, cmd("sale.checkout", { items: [{ product_id: d.products[0].id, qty: 2 }], is_credit: true, customer_name: "Test customer", downpayment: 6 }));
  assert.equal(sold.debts[0].balance, 20); assert.equal(sold.drawer[0].amount, 6);
  assert.throws(() => applyCommand(sold, cmd("debt.pay", { debt_id: sold.debts[0].id, amount: 21 })), /balance/i);
  const paid = applyCommand(sold, cmd("debt.pay", { debt_id: sold.debts[0].id, amount: 8 }));
  assert.equal(paid.debts[0].balance, 12); assert.equal(paid.debts[0].status, "partially_paid");
  assert.throws(() => applyCommand(paid, cmd("sale.void", { sale_id: sold.sales[0].id, reason: "Mistake" })), /repayment/i);
});
test("stock adjustments reject overselling and count reconciliation balances the ledger", () => {
  const d = fixture(); const id = d.products[0].id;
  assert.throws(() => applyCommand(d, cmd("stock.adjust", { product_id: id, qty: 5, direction: "remove", reason: "Spoiled" })), /stock/i);
  const counted = applyCommand(d, cmd("count.submit", { items: [{ product_id: id, counted_qty: 1.5 }] }));
  assert.equal(counted.products[0].stock_qty, 1.5); assert.equal(counted.movements.at(-1)?.qty_change, -2.5);
  assert.equal(counted.movements.reduce((a, r) => a + r.qty_change, 0), 1.5);
});
test("expense deletion reverses its cash payout exactly once", () => {
  const d = fixture();
  const spent = applyCommand(d, cmd("expense.save", { category: "Utilities", description: "Electricity", amount: 50, expense_date: "2026-10-29", from_drawer: true }));
  assert.equal(spent.drawer[0].amount, -50);
  const removed = applyCommand(spent, cmd("expense.delete", { expense_id: spent.expenses.at(-1)!.id }));
  assert.equal(removed.drawer.reduce((sum, entry) => sum + entry.amount, 0), 0);
});
test("business date follows Philippine midnight and CSV neutralizes formulas", () => {
  assert.equal(businessDate(new Date("2026-10-28T16:01:00Z")), "2026-10-29");
  assert.equal(toCSV(["Name", "Amount"], [["=1+1", 20], ["A, B", -5]]), '\ufeff"Name","Amount"\r\n"\'=1+1","20"\r\n"A, B","-5"');
});
