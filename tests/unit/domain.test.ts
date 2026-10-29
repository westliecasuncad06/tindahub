import test from "node:test";
import assert from "node:assert/strict";
import {
  applyCommand,
  auditStock,
  businessDate,
  calculateCart,
  drawerBalance,
  money,
  toCSV,
} from "../../src/lib/domain.ts";
import { createDemoData } from "../../src/lib/demo.ts";
import type { Command } from "../../src/lib/types.ts";

const cmd = (
  type: Command["type"],
  payload: Command["payload"],
  id: string = crypto.randomUUID(),
): Command => ({ id, type, payload });
const fixture = () => {
  const data = createDemoData(new Date("2026-10-29T04:00:00Z"));
  data.sales = [];
  data.sale_items = [];
  data.debts = [];
  data.debt_payments = [];
  data.drawer = [];
  data.products[0].stock_qty = 4;
  data.products[0].selling_price = 13;
  data.products[0].cost_price = 10;
  data.movements = [
    {
      id: "opening",
      product_id: data.products[0].id,
      type: "purchase",
      qty_change: 4,
      qty_after: 4,
      unit_cost: 10,
      reason: "Opening",
      created_at: "2026-10-29T04:00:00Z",
    },
  ];
  return data;
};
test("combines duplicate product lines before checking available stock", () => {
  const d = fixture();
  assert.throws(
    () =>
      calculateCart(
        d.products,
        [
          { product_id: d.products[0].id, qty: 3 },
          { product_id: d.products[0].id, qty: 2 },
        ],
        0,
      ),
    /stock/i,
  );
});
test("calculates fractional quantities with centavo rounding", () => {
  const d = fixture();
  d.products[0].selling_price = 12.35;
  const total = calculateCart(
    d.products,
    [{ product_id: d.products[0].id, qty: 1.125 }],
    0.1,
  );
  assert.equal(total.subtotal, 13.89);
  assert.equal(total.total, 13.79);
  assert.equal(money(13.79), "₱13.79");
});
test("rejects invalid discount and negative or nonfinite quantities", () => {
  const d = fixture();
  const id = d.products[0].id;
  for (const qty of [-1, 0, NaN, Infinity, 0.0001])
    assert.throws(() =>
      calculateCart(d.products, [{ product_id: id, qty }], 0),
    );
  assert.throws(
    () => calculateCart(d.products, [{ product_id: id, qty: 1 }], 14),
    /discount/i,
  );
});
test("sale checkout is atomic and idempotent and void restores the ledger", () => {
  const d = fixture();
  const id = d.products[0].id;
  assert.throws(
    () =>
      applyCommand(
        d,
        cmd("sale.checkout", { items: [{ product_id: id, qty: 2 }], cash: 10 }),
      ),
    /payment/i,
  );
  assert.equal(d.products[0].stock_qty, 4);
  assert.equal(d.sales.length, 0);
  const command = cmd("sale.checkout", {
    items: [{ product_id: id, qty: 2 }],
    cash: 50,
  });
  const sold = applyCommand(d, command);
  assert.equal(sold.products[0].stock_qty, 2);
  assert.equal(sold.sales[0].change_given, 24);
  assert.equal(sold.drawer[0].amount, 26);
  assert.equal(sold.sales[0].profit_total, 6);
  const twice = applyCommand(sold, command);
  assert.equal(twice.sales.length, 1);
  assert.equal(twice.movements.length, 2);
  assert.throws(
    () =>
      applyCommand(sold, {
        ...command,
        payload: { ...command.payload, cash: 100 },
      }),
    /request/i,
  );
  const restored = applyCommand(
    sold,
    cmd("sale.void", { sale_id: sold.sales[0].id, reason: "Mistake" }),
  );
  assert.equal(restored.products[0].stock_qty, 4);
  assert.equal(
    restored.drawer.reduce((a, r) => a + r.amount, 0),
    0,
  );
  assert.equal(
    restored.movements.reduce((a, r) => a + r.qty_change, 0),
    4,
  );
  assert.throws(
    () =>
      applyCommand(
        restored,
        cmd("sale.void", { sale_id: sold.sales[0].id, reason: "Again" }),
      ),
    /void/i,
  );
});
test("credit checkout records only cash received and rejects overpayment and unsafe void", () => {
  const d = fixture();
  const sold = applyCommand(
    d,
    cmd("sale.checkout", {
      items: [{ product_id: d.products[0].id, qty: 2 }],
      is_credit: true,
      customer_name: "Test customer",
      downpayment: 6,
    }),
  );
  assert.equal(sold.debts[0].balance, 20);
  assert.equal(sold.drawer[0].amount, 6);
  assert.throws(
    () =>
      applyCommand(
        sold,
        cmd("debt.pay", { debt_id: sold.debts[0].id, amount: 21 }),
      ),
    /balance/i,
  );
  const paid = applyCommand(
    sold,
    cmd("debt.pay", { debt_id: sold.debts[0].id, amount: 8 }),
  );
  assert.equal(paid.debts[0].balance, 12);
  assert.equal(paid.debts[0].status, "partially_paid");
  assert.throws(
    () =>
      applyCommand(
        paid,
        cmd("sale.void", { sale_id: sold.sales[0].id, reason: "Mistake" }),
      ),
    /repayment/i,
  );
});
test("stock adjustments reject overselling and count reconciliation balances the ledger", () => {
  const d = fixture();
  const id = d.products[0].id;
  assert.throws(
    () =>
      applyCommand(
        d,
        cmd("stock.adjust", {
          product_id: id,
          qty: 5,
          direction: "remove",
          reason: "Spoiled",
        }),
      ),
    /stock/i,
  );
  const counted = applyCommand(
    d,
    cmd("count.submit", { items: [{ product_id: id, counted_qty: 1.5 }] }),
  );
  assert.equal(counted.products[0].stock_qty, 1.5);
  assert.equal(counted.movements.at(-1)?.qty_change, -2.5);
  assert.equal(
    counted.movements.reduce((a, r) => a + r.qty_change, 0),
    1.5,
  );
});
test("expense deletion reverses its cash payout exactly once", () => {
  const d = fixture();
  const spent = applyCommand(
    d,
    cmd("expense.save", {
      category: "Utilities",
      description: "Electricity",
      amount: 50,
      expense_date: "2026-10-29",
      from_drawer: true,
    }),
  );
  assert.equal(spent.drawer[0].amount, -50);
  const removed = applyCommand(
    spent,
    cmd("expense.delete", { expense_id: spent.expenses.at(-1)!.id }),
  );
  assert.equal(
    removed.drawer.reduce((sum, entry) => sum + entry.amount, 0),
    0,
  );
});
test("business date follows Philippine midnight and CSV neutralizes formulas", () => {
  assert.equal(businessDate(new Date("2026-10-28T16:01:00Z")), "2026-10-29");
  assert.equal(
    toCSV(
      ["Name", "Amount"],
      [
        ["=1+1", 20],
        ["A, B", -5],
      ],
    ),
    '\ufeff"Name","Amount"\r\n"\'=1+1","20"\r\n"A, B","-5"',
  );
});

test("cart accepts a free sale and rejects missing or inactive products", () => {
  const d = fixture();
  const id = d.products[0].id;
  assert.equal(
    calculateCart(d.products, [{ product_id: id, qty: 1 }], 13).total,
    0,
  );
  assert.throws(() => calculateCart(d.products, [], 0), /empty/i);
  assert.throws(
    () => calculateCart(d.products, [{ product_id: "missing", qty: 1 }], 0),
    /product/i,
  );
  d.products[0].is_active = false;
  assert.throws(
    () => calculateCart(d.products, [{ product_id: id, qty: 1 }], 0),
    /product/i,
  );
});

test("duplicate cart lines become one immutable sale item with authoritative prices", () => {
  const d = fixture();
  const id = d.products[0].id;
  const sold = applyCommand(
    d,
    cmd("sale.checkout", {
      items: [
        { product_id: id, qty: 1 },
        { product_id: id, qty: 1 },
      ],
      cash: 50,
      total: 1,
    }),
  );
  assert.equal(sold.sale_items.length, 1);
  assert.equal(sold.sale_items[0].qty, 2);
  assert.equal(sold.sales[0].total, 26);
  const repriced = applyCommand(
    sold,
    cmd("product.save", { id, selling_price: 99, cost_price: 88 }),
  );
  assert.equal(repriced.sale_items[0].unit_price, 13);
  assert.equal(repriced.sale_items[0].unit_cost, 10);
});

test("cash checkout validates payment and credit requires a real customer and valid downpayment", () => {
  const d = fixture();
  const items = [{ product_id: d.products[0].id, qty: 1 }];
  for (const cash of [-1, NaN, Infinity, "50", null])
    assert.throws(() => applyCommand(d, cmd("sale.checkout", { items, cash })));
  assert.throws(
    () =>
      applyCommand(
        d,
        cmd("sale.checkout", { items, is_credit: true, customer_name: " " }),
      ),
    /customer/i,
  );
  assert.throws(
    () =>
      applyCommand(
        d,
        cmd("sale.checkout", {
          items,
          is_credit: true,
          customer_name: "Test",
          downpayment: 14,
        }),
      ),
    /downpayment/i,
  );
  assert.throws(
    () =>
      applyCommand(
        d,
        cmd("sale.checkout", { items, is_credit: "false", cash: 20 }),
      ),
    /boolean/i,
  );
});

test("voiding a credit sale with only its downpayment reverses collected cash and closes the debt", () => {
  const d = fixture();
  const sold = applyCommand(
    d,
    cmd("sale.checkout", {
      items: [{ product_id: d.products[0].id, qty: 1 }],
      is_credit: true,
      customer_name: "Test",
      downpayment: 3,
    }),
  );
  const voided = applyCommand(
    sold,
    cmd("sale.void", { sale_id: sold.sales[0].id, reason: "Wrong item" }),
  );
  assert.equal(voided.debts[0].status, "voided");
  assert.equal(voided.debts[0].balance, 0);
  assert.equal(voided.debts[0].paid_amount, 3); // history remains readable
  assert.equal(voided.debt_payments[0].amount, 3);
  assert.equal(
    voided.drawer.reduce((sum, r) => sum + r.amount, 0),
    0,
  );
  assert.throws(
    () =>
      applyCommand(
        voided,
        cmd("debt.pay", { debt_id: voided.debts[0].id, amount: 1 }),
      ),
    /void/i,
  );
});

test("manual debt downpayments and final repayment preserve the payment and cash histories", () => {
  const d = fixture();
  const created = applyCommand(
    d,
    cmd("debt.create", {
      customer_name: "Sample customer",
      total_amount: 100,
      downpayment: 20,
      due_date: "2026-11-01",
    }),
  );
  assert.equal(created.debts[0].balance, 80);
  assert.equal(created.debt_payments[0].is_downpayment, true);
  const paid = applyCommand(
    created,
    cmd("debt.pay", { debt_id: created.debts[0].id, amount: 80 }),
  );
  assert.equal(paid.debts[0].status, "paid");
  assert.equal(paid.debts[0].paid_amount, 100);
  assert.equal(paid.debts[0].balance, 0);
  assert.equal(
    paid.drawer.reduce((sum, entry) => sum + entry.amount, 0),
    100,
  );
  assert.throws(
    () =>
      applyCommand(
        paid,
        cmd("debt.pay", { debt_id: paid.debts[0].id, amount: 1 }),
      ),
    /balance/i,
  );
});

test("product creation adds opening ledger stock and edits cannot bypass stock adjustments", () => {
  const d = fixture();
  const created = applyCommand(
    d,
    cmd("product.save", {
      name: "Sample snack",
      sku: "SAMPLE-001",
      cost_price: 10,
      selling_price: 13,
      stock_qty: 2.5,
    }),
  );
  const product = created.products.at(-1)!;
  assert.equal(product.stock_qty, 2.5);
  assert.equal(created.movements.at(-1)?.qty_change, 2.5);
  assert.throws(
    () =>
      applyCommand(
        created,
        cmd("product.save", { id: product.id, stock_qty: 10 }),
      ),
    /stock/i,
  );
  assert.throws(
    () =>
      applyCommand(
        created,
        cmd("product.save", { name: "Duplicate", sku: "sample-001" }),
      ),
    /SKU/i,
  );
  assert.throws(
    () =>
      applyCommand(
        created,
        cmd("product.save", { name: "No category", category_id: "missing" }),
      ),
    /category/i,
  );
  const archived = applyCommand(
    created,
    cmd("product.archive", { product_id: product.id }),
  );
  assert.equal(archived.products.at(-1)?.is_active, false);
  assert.equal(archived.movements.at(-1)?.qty_change, 2.5);
});

test("restocking can update current cost without repricing past movements", () => {
  const d = fixture();
  const restocked = applyCommand(
    d,
    cmd("stock.adjust", {
      product_id: d.products[0].id,
      direction: "add",
      qty: 0.5,
      unit_cost: 12,
      update_cost_price: true,
      reason: "New delivery",
    }),
  );
  assert.equal(restocked.products[0].stock_qty, 4.5);
  assert.equal(restocked.products[0].cost_price, 12);
  assert.equal(restocked.movements[0].unit_cost, 10);
  assert.equal(restocked.movements.at(-1)?.unit_cost, 12);
});

test("a multi-product physical count rolls back on an invalid row and rejects duplicate rows", () => {
  const d = fixture();
  const id = d.products[0].id;
  assert.throws(
    () =>
      applyCommand(
        d,
        cmd("count.submit", {
          items: [
            { product_id: id, counted_qty: 1 },
            { product_id: "missing", counted_qty: 2 },
          ],
        }),
      ),
    /product/i,
  );
  assert.equal(d.products[0].stock_qty, 4);
  assert.equal(d.movements.length, 1);
  assert.throws(
    () =>
      applyCommand(
        d,
        cmd("count.submit", {
          items: [
            { product_id: id, counted_qty: 1 },
            { product_id: id, counted_qty: 2 },
          ],
        }),
      ),
    /duplicate/i,
  );
  assert.throws(
    () =>
      applyCommand(
        d,
        cmd("count.submit", { items: [{ product_id: id, counted_qty: -1 }] }),
      ),
    /quantity/i,
  );
});

test("category creation enforces unique names and a valid product category", () => {
  const d = fixture();
  const created = applyCommand(
    d,
    cmd("category.save", { name: "New category", color: "#AABBCC" }),
  );
  const category = created.categories.at(-1)!;
  const product = applyCommand(
    created,
    cmd("product.save", { name: "Category sample", category_id: category.id }),
  );
  assert.equal(product.products.at(-1)?.category_id, category.id);
  assert.throws(
    () =>
      applyCommand(created, cmd("category.save", { name: " new CATEGORY " })),
    /category/i,
  );
  assert.throws(
    () =>
      applyCommand(
        d,
        cmd("category.save", { name: "Unsafe", color: "url(x)" }),
      ),
    /color/i,
  );
});

test("drawer openings are once per day and counts report variance without changing expected cash", () => {
  const d = fixture();
  const options = { now: new Date("2026-10-29T04:00:00Z") };
  const opened = applyCommand(
    d,
    cmd("drawer.record", { type: "opening", amount: 100 }),
    options,
  );
  assert.throws(
    () =>
      applyCommand(
        opened,
        cmd("drawer.record", { type: "opening", amount: 50 }),
        options,
      ),
    /opening/i,
  );
  const deposited = applyCommand(
    opened,
    cmd("drawer.record", { type: "deposit", amount: 20 }),
    options,
  );
  const paidOut = applyCommand(
    deposited,
    cmd("drawer.record", { type: "payout", amount: 10, note: "Supplies" }),
    options,
  );
  const counted = applyCommand(
    paidOut,
    cmd("drawer.record", { type: "count", amount: 105 }),
    options,
  );
  assert.equal(drawerBalance(counted, "2026-10-29"), 110);
  assert.equal(counted.drawer.at(-1)?.amount, 0);
  assert.equal(counted.drawer.at(-1)?.actual_amount, 105);
  assert.equal(counted.drawer.at(-1)?.variance, -5);
});

test("expense refunds use the current drawer day without rewriting the original payout", () => {
  const d = fixture();
  const spent = applyCommand(
    d,
    cmd("expense.save", {
      category: "Transport",
      amount: 25,
      expense_date: "2026-10-28",
      from_drawer: true,
    }),
    { now: new Date("2026-10-28T04:00:00Z") },
  );
  const refunded = applyCommand(
    spent,
    cmd("expense.delete", { expense_id: spent.expenses.at(-1)!.id }),
    { now: new Date("2026-10-29T04:00:00Z") },
  );
  assert.equal(drawerBalance(refunded, "2026-10-28"), -25);
  assert.equal(drawerBalance(refunded, "2026-10-29"), 25);
  assert.throws(
    () =>
      applyCommand(
        refunded,
        cmd("expense.delete", { expense_id: spent.expenses.at(-1)!.id }),
      ),
    /expense/i,
  );
});

test("staff may check out but cannot change inventory, void sales, or settings", () => {
  const d = fixture();
  d.role = "staff";
  for (const [type, payload] of [
    ["product.save", { name: "Unauthorized" }],
    ["settings.update", { store_name: "Changed" }],
    ["sale.void", { sale_id: "missing", reason: "Mistake" }],
  ] as const) {
    assert.throws(() => applyCommand(d, cmd(type, payload)), /owner/i);
  }
  const sold = applyCommand(
    d,
    cmd("sale.checkout", {
      items: [{ product_id: d.products[0].id, qty: 1 }],
      cash: 20,
    }),
  );
  assert.equal(sold.sales[0].total, 13);
});

test("ledger audit finds mismatches and repair appends an adjustment without changing product stock", () => {
  const d = fixture();
  d.products = [d.products[0]];
  d.products[0].stock_qty = 5;
  assert.deepEqual(
    auditStock(d).map((row) => [row.stock_qty, row.ledger_qty, row.difference]),
    [[5, 4, 1]],
  );
  const repaired = applyCommand(
    d,
    cmd("stock.repair", { reason: "Reviewed opening mismatch" }),
  );
  assert.equal(repaired.products[0].stock_qty, 5);
  assert.equal(repaired.movements[0].qty_change, 4);
  assert.equal(repaired.movements.at(-1)?.qty_change, 1);
  assert.deepEqual(auditStock(repaired), []);
});

test("settings are validated and only known fields can be changed", () => {
  const d = fixture();
  const updated = applyCommand(
    d,
    cmd("settings.update", {
      store_name: "Sample Store",
      profit_target: 1000,
      role: "staff",
    }),
  );
  assert.equal(updated.settings.store_name, "Sample Store");
  assert.equal(updated.settings.profit_target, 1000);
  assert.equal(updated.role, "owner");
  assert.throws(
    () => applyCommand(d, cmd("settings.update", { profit_target: -1 })),
    /target/i,
  );
  assert.throws(
    () => applyCommand(d, cmd("settings.update", { store_name: " " })),
    /store/i,
  );
});

test("calendar validation rejects impossible dates and precision beyond database limits", () => {
  const d = fixture();
  assert.throws(
    () =>
      applyCommand(
        d,
        cmd("debt.create", {
          customer_name: "Sample",
          total_amount: 10,
          due_date: "2026-02-30",
        }),
      ),
    /date/i,
  );
  assert.throws(
    () =>
      applyCommand(
        d,
        cmd("expense.save", {
          category: "Other",
          amount: 0.001,
          expense_date: "2026-10-29",
        }),
      ),
    /amount/i,
  );
  assert.throws(
    () =>
      calculateCart(
        d.products,
        [{ product_id: d.products[0].id, qty: 1.2345 }],
        0,
      ),
    /quantity/i,
  );
  assert.throws(() => businessDate(new Date("bad")), /date/i);
});

test("command replay ignores object-key order but rejects a different request and malformed input", () => {
  const d = fixture();
  const id = crypto.randomUUID();
  const saved = applyCommand(
    d,
    cmd("settings.update", { store_name: "Demo", profit_target: 100 }, id),
  );
  const replayed = applyCommand(
    saved,
    cmd("settings.update", { profit_target: 100, store_name: "Demo" }, id),
  );
  assert.deepEqual(replayed, saved);
  assert.throws(
    () =>
      applyCommand(
        d,
        cmd("settings.update", { store_name: "Demo" }, "__proto__"),
      ),
    /request/i,
  );
  assert.throws(
    () =>
      applyCommand(d, {
        id: crypto.randomUUID(),
        type: "unknown",
        payload: {},
      } as unknown as Command),
    /command/i,
  );
});

test("sample data is deterministic, fictional, populated, and balances every stock ledger", () => {
  const now = new Date("2026-10-29T04:00:00Z");
  const first = createDemoData(now);
  const second = createDemoData(now);
  assert.deepEqual(first, second);
  assert.ok(first.products.length >= 20);
  assert.ok(first.sales.length > 0);
  assert.ok(first.debts.length > 0);
  assert.ok(first.expenses.length > 0);
  assert.deepEqual(auditStock(first), []);
  assert.equal(
    first.sales
      .filter((sale) => sale.status === "completed")
      .every(
        (sale) =>
          sale.total ===
          Math.round((sale.subtotal - sale.discount) * 100) / 100,
      ),
    true,
  );
});

test("drawer aggregate overflow is rejected atomically instead of leaving an unreadable snapshot", () => {
  const d = fixture();
  const options = { now: new Date("2026-10-29T04:00:00Z") };
  const opened = applyCommand(
    d,
    cmd("drawer.record", { type: "opening", amount: 9_999_999_999.99 }),
    options,
  );
  assert.throws(
    () =>
      applyCommand(
        opened,
        cmd("drawer.record", { type: "deposit", amount: 0.01 }),
        options,
      ),
    /limit/i,
  );
  assert.equal(opened.drawer.length, 1);
  assert.equal(drawerBalance(opened, "2026-10-29"), 9_999_999_999.99);
  const negative = applyCommand(
    d,
    cmd("drawer.record", { type: "payout", amount: 9_999_999_999.99 }),
    options,
  );
  assert.throws(
    () =>
      applyCommand(
        negative,
        cmd("drawer.record", { type: "count", amount: 9_999_999_999.99 }),
        options,
      ),
    /limit/i,
  );
  assert.equal(negative.drawer.length, 1);
});

test("matching physical counts remain visible in count history without changing the ledger balance", () => {
  const d = fixture();
  const id = d.products[0].id;
  const counted = applyCommand(
    d,
    cmd("count.submit", { items: [{ product_id: id, counted_qty: 4 }] }),
  );
  assert.equal(counted.movements.at(-1)?.type, "count");
  assert.equal(counted.movements.at(-1)?.qty_change, 0);
  assert.equal(counted.products[0].stock_qty, 4);
  assert.equal(
    counted.movements.reduce((sum, row) => sum + row.qty_change, 0),
    4,
  );
});

test("fully discounted credit checkout completes without creating a zero-amount debt", () => {
  const d = fixture();
  const sold = applyCommand(
    d,
    cmd("sale.checkout", {
      items: [{ product_id: d.products[0].id, qty: 1 }],
      discount: 13,
      is_credit: true,
      customer_name: "Sample",
    }),
  );
  assert.equal(sold.sales[0].total, 0);
  assert.equal(sold.debts.length, 0);
  assert.equal(sold.drawer.length, 0);
});

test("null numeric product fields cannot silently reset an existing price or stock", () => {
  const d = fixture();
  const id = d.products[0].id;
  for (const field of [
    "cost_price",
    "selling_price",
    "stock_qty",
    "reorder_level",
  ]) {
    assert.throws(() =>
      applyCommand(d, cmd("product.save", { id, [field]: null })),
    );
  }
  assert.equal(d.products[0].selling_price, 13);
  assert.equal(d.products[0].stock_qty, 4);
});

test("a stale observed count is rejected without rewriting stock", () => {
  const d = fixture();
  assert.throws(
    () =>
      applyCommand(
        d,
        cmd("count.submit", {
          items: [
            {
              product_id: d.products[0].id,
              counted_qty: 5,
              expected_stock_qty: 3,
            },
          ],
        }),
      ),
    /changed|stale/i,
  );
  assert.equal(d.products[0].stock_qty, 4);
});
