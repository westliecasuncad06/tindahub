import assert from "node:assert/strict";
import { createTestDatabase } from "./database-fixture.mjs";

const db = await createTestDatabase();
let checks = 0;
const ok = (condition, message) => {
  assert.ok(condition, message);
  checks++;
  console.log("PASS " + message);
};
const owner = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";
const staff = "10000000-0000-4000-8000-000000000003";
async function login(id) {
  await db.exec("reset role;");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    id ?? "",
  ]);
  await db.exec("set role " + (id ? "authenticated" : "anon"));
}
async function rpc(name, args = []) {
  return (
    await db.query(
      "select public." +
        name +
        "(" +
        args.map((_, i) => "$" + (i + 1)).join(",") +
        ") as data",
      args,
    )
  ).rows[0].data;
}
const command = (store, type, payload, id = crypto.randomUUID()) =>
  rpc("app_command", [store, { id, type, payload }]);
try {
  await db.query(
    "insert into auth.users(id,email) values ($1,$2),($3,$4),($5,$6)",
    [
      owner,
      "owner@example.test",
      other,
      "other@example.test",
      staff,
      "staff@example.test",
    ],
  );
  await login(owner);
  const initial = await rpc("create_store", ["Owner test store", "Owner"]);
  const store = initial.store_id;
  ok(
    initial.user_name === "Owner",
    "workspace identity comes from the signed-in profile",
  );
  ok(
    initial.role === "owner" && initial.products.length === 0,
    "new owner receives an empty isolated store",
  );
  await assert.rejects(
    command(store, "sale.checkout", { cash: 0 }),
    /empty|items/i,
  );
  checks++;
  await assert.rejects(command(store, "count.submit", {}), /items/i);
  checks++;
  let data = await command(store, "product.save", {
    name: "Test rice",
    sku: "RICE",
    unit: "kg",
    selling_price: 13,
    cost_price: 10,
    stock_qty: 4,
  });
  const product = data.products[0].id;
  ok(
    data.movements[0].qty_change === 4,
    "opening stock is backed by a ledger entry",
  );
  const id = crypto.randomUUID();
  const payload = {
    items: [
      { product_id: product, qty: 1 },
      { product_id: product, qty: 1 },
    ],
    cash: 50,
  };
  data = await command(store, "sale.checkout", payload, id);
  ok(
    data.sales[0].total === 26 &&
      data.sale_items.length === 1 &&
      data.products[0].stock_qty === 2,
    "checkout aggregates quantities and calculates authoritative totals",
  );
  data = await command(store, "sale.checkout", payload, id);
  ok(
    data.sales.length === 1 && data.movements.length === 2,
    "retried checkout has one sale and one stock deduction",
  );
  await assert.rejects(
    command(store, "sale.checkout", { ...payload, cash: 100 }, id),
    /request/i,
  );
  checks++;
  await assert.rejects(
    command(store, "sale.checkout", {
      items: [{ product_id: product, qty: 3 }],
      cash: 100,
    }),
    /stock/i,
  );
  checks++;
  data = await rpc("app_snapshot", [store]);
  ok(
    data.sales.length === 1 && data.products[0].stock_qty === 2,
    "failed checkout rolls back every financial and stock write",
  );
  data = await command(store, "sale.void", {
    sale_id: data.sales[0].id,
    reason: "Wrong item",
  });
  ok(
    data.products[0].stock_qty === 4 &&
      data.drawer.reduce((s, r) => s + r.amount, 0) === 0,
    "void restores stock and reverses collected cash",
  );
  data = await command(store, "sale.checkout", {
    items: [{ product_id: product, qty: 1.125 }],
    cash: 50,
  });
  ok(
    data.sales.at(-1).total === 14.63,
    "fractional checkout rounds half up to centavos",
  );
  data = await command(store, "sale.checkout", {
    items: [{ product_id: product, qty: 1 }],
    is_credit: true,
    customer_name: "Sample",
    downpayment: 3,
  });
  const debt = data.debts[0].id;
  await assert.rejects(
    command(store, "debt.pay", { debt_id: debt, amount: 11 }),
    /balance/i,
  );
  checks++;
  data = await command(store, "debt.pay", { debt_id: debt, amount: 4 });
  ok(
    data.debts[0].balance === 6 && data.debts[0].status === "partially_paid",
    "partial repayment updates debt and cash together",
  );
  await assert.rejects(
    command(store, "sale.void", {
      sale_id: data.debts[0].sale_id,
      reason: "Wrong",
    }),
    /repayment/i,
  );
  checks++;
  data = await command(store, "count.submit", {
    items: [{ product_id: product, counted_qty: 2 }],
  });
  ok(
    data.products[0].stock_qty === 2 && data.movements.at(-1).type === "count",
    "physical count records reconciliation",
  );
  await assert.rejects(
    command(store, "count.submit", {
      items: [{ product_id: product, counted_qty: 4, expected_stock_qty: 3 }],
    }),
    /changed|stale/i,
  );
  checks++;
  ok(
    (await rpc("app_snapshot", [store])).products[0].stock_qty === 2,
    "stale count rolls back without restoring stock",
  );
  data = await command(store, "expense.save", {
    category: "Transport",
    amount: 20,
    from_drawer: true,
  });
  data = await command(store, "expense.delete", {
    expense_id: data.expenses[0].id,
  });
  ok(
    data.expenses.length === 0 && data.drawer.at(-1).type === "reversal",
    "expense deletion retains and reverses its payout",
  );
  const audit = await db.query(
    "select p.id from products p left join stock_movements m on m.store_id=p.store_id and m.product_id=p.id group by p.id having p.stock_qty <> coalesce(sum(m.qty_change),0)",
  );
  ok(audit.rows.length === 0, "all stock ledger balances reconcile");
  await assert.rejects(
    db.query("update products set stock_qty=100 where id=$1", [product]),
    /permission/i,
  );
  checks++;
  await rpc("add_staff", [store, "staff@example.test"]);
  await login(staff);
  ok(
    (await rpc("app_snapshot", [store])).role === "staff",
    "staff membership is read from protected database records",
  );
  await assert.rejects(
    command(store, "settings.update", { store_name: "Intrusion" }),
    /owner/i,
  );
  checks++;
  await login(other);
  const isolated = await rpc("create_store", ["Other store", "Other"]);
  await command(isolated.store_id, "drawer.record", {
    type: "opening",
    amount: 9999999999.99,
  });
  await assert.rejects(
    command(isolated.store_id, "drawer.record", {
      type: "deposit",
      amount: 0.01,
    }),
    /limit/i,
  );
  checks++;
  ok(
    (await rpc("app_snapshot", [isolated.store_id])).drawer.length === 1,
    "drawer overflow rolls back atomically",
  );
  const helpers = await db.query(
    "select has_function_privilege('authenticated','private.cash(uuid,text,numeric,text,uuid,uuid,numeric)','EXECUTE') allowed",
  );
  ok(
    !helpers.rows[0].allowed,
    "unvalidated helper functions are not callable by clients",
  );
  ok(
    (await db.query("select * from products")).rows.length === 0,
    "RLS hides another store even without an application filter",
  );
  await assert.rejects(rpc("app_snapshot", [store]), /access|membership/i);
  checks++;
  await assert.rejects(
    command(isolated.store_id, "stock.adjust", {
      product_id: product,
      direction: "add",
      qty: 1,
      reason: "Intrusion",
    }),
    /product/i,
  );
  checks++;
  await login(null);
  await assert.rejects(rpc("app_snapshot", [store]), /permission/i);
  checks++;
  await assert.rejects(
    rpc("create_store", ["Unauthorized", "Anonymous"]),
    /permission/i,
  );
  checks++;
  await assert.rejects(
    command(store, "drawer.record", { type: "deposit", amount: 10 }),
    /permission/i,
  );
  checks++;
  await db.exec("reset role");
  const rls = await db.query(
    "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity",
  );
  ok(rls.rows.length === 0, "every exposed business table enables RLS");
  const definers = await db.query(
    "select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and prosecdef",
  );
  ok(
    definers.rows.length === 0,
    "no SECURITY DEFINER function is exposed in the public schema",
  );
  console.log("Database checks passed: " + checks);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
