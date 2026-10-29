import type { CartItem } from "../types.ts";
import type { CommandContext } from "../command-context.ts";
import { debtStatus } from "../command-context.ts";
import { calculateCart } from "../cart.ts";
import { boolean, calendarDate, cents, ensure, text } from "../validation.ts";

export function checkout(
  ctx: CommandContext,
  p: Record<string, unknown>,
  requestId: string,
) {
  const { data } = ctx;
  const totals = calculateCart(
    data.products,
    p.items as CartItem[],
    p.discount === undefined ? 0 : (p.discount as number),
  );
  const isCredit = boolean(p.is_credit);
  const customer = text(p.customer_name, "Customer", 120, isCredit);
  const paid = cents(
    isCredit ? (p.downpayment ?? 0) : p.cash,
    isCredit ? "Downpayment" : "Payment",
  );
  const total = cents(totals.total);
  ensure(
    isCredit ? paid <= total : paid >= total,
    "invalid_payment",
    isCredit
      ? "Downpayment cannot exceed the total."
      : "Payment is insufficient.",
  );
  const saleId = ctx.id();
  const prefix = ctx.today.replaceAll("-", "") + "-";
  const sequence =
    data.sales
      .filter((row) => row.receipt_no.startsWith(prefix))
      .reduce(
        (max, row) =>
          Math.max(max, Number(row.receipt_no.slice(prefix.length)) || 0),
        0,
      ) + 1;
  data.sales.push({
    id: saleId,
    receipt_no: prefix + sequence.toString().padStart(4, "0"),
    subtotal: totals.subtotal,
    discount: totals.discount,
    total: totals.total,
    cash_received: paid / 100,
    change_given: isCredit ? 0 : (paid - total) / 100,
    cogs_total: totals.cogs_total,
    profit_total: totals.profit_total,
    status: "completed",
    is_credit: isCredit,
    customer_name: customer,
    note: text(p.note, "Note"),
    created_at: ctx.at,
    request_id: requestId,
  });
  for (const line of totals.items) {
    const product = ctx.product(line.product.id);
    data.sale_items.push({
      id: ctx.id(),
      sale_id: saleId,
      product_id: product.id,
      product_name: product.name,
      qty: line.qty,
      unit_price: product.selling_price,
      unit_cost: product.cost_price,
      line_total: line.line_total,
    });
    ctx.movement(
      product,
      -line.qty,
      "sale",
      "Sale",
      product.cost_price,
      saleId,
    );
  }
  const collected = isCredit ? paid : total;
  if (collected > 0)
    ctx.cash("sale", collected / 100, "Sale payment", { ref_sale_id: saleId });
  if (isCredit && total > 0)
    createDebt(
      ctx,
      {
        ...p,
        customer_name: customer,
        total_amount: totals.total,
        downpayment: paid / 100,
      },
      saleId,
      false,
    );
}

export function createDebt(
  ctx: CommandContext,
  p: Record<string, unknown>,
  saleId: string | null = null,
  recordCash = true,
) {
  const total = cents(p.total_amount, "Total amount");
  const paid = cents(p.downpayment ?? 0, "Downpayment");
  ensure(
    total > 0 && paid <= total,
    "invalid_debt",
    "Debt amount must be positive and downpayment cannot exceed it.",
  );
  const debt = {
    id: ctx.id(),
    customer_name: text(p.customer_name, "Customer", 120, true),
    customer_phone: text(p.customer_phone, "Phone", 30),
    sale_id: saleId,
    total_amount: total / 100,
    paid_amount: paid / 100,
    balance: (total - paid) / 100,
    status: debtStatus(total / 100, paid / 100),
    due_date: calendarDate(p.due_date, true),
    notes: text(p.notes, "Notes"),
    created_at: ctx.at,
  };
  ctx.data.debts.push(debt);
  if (paid > 0) {
    ctx.data.debt_payments.push({
      id: ctx.id(),
      debt_id: debt.id,
      amount: paid / 100,
      payment_date: ctx.today,
      note: "Downpayment",
      is_downpayment: true,
      created_at: ctx.at,
    });
    if (recordCash) ctx.cash("deposit", paid / 100, "Debt downpayment");
  }
}

export function payDebt(ctx: CommandContext, p: Record<string, unknown>) {
  const debt = ctx.data.debts.find((row) => row.id === p.debt_id);
  ensure(debt, "missing_debt", "Debt does not exist.");
  ensure(debt.status !== "voided", "voided_debt", "Cannot pay a voided debt.");
  const amount = cents(p.amount);
  const balance = cents(debt.balance);
  ensure(
    amount > 0 && amount <= balance,
    "invalid_payment",
    "Payment must be positive and cannot exceed the outstanding balance.",
  );
  const date =
    p.payment_date === undefined ? ctx.today : calendarDate(p.payment_date)!;
  // Cash is received now even when the user annotates a historical payment date.
  debt.paid_amount = (cents(debt.paid_amount) + amount) / 100;
  debt.balance = (balance - amount) / 100;
  debt.status = debtStatus(debt.total_amount, debt.paid_amount);
  ctx.data.debt_payments.push({
    id: ctx.id(),
    debt_id: debt.id,
    amount: amount / 100,
    payment_date: date,
    note: text(p.note, "Note"),
    is_downpayment: false,
    created_at: ctx.at,
  });
  ctx.cash("deposit", amount / 100, "Debt payment");
}

export function voidSale(ctx: CommandContext, p: Record<string, unknown>) {
  const sale = ctx.data.sales.find((row) => row.id === p.sale_id);
  ensure(sale, "missing_sale", "Sale does not exist.");
  ensure(
    sale.status !== "voided",
    "already_voided",
    "Sale has already been voided.",
  );
  const reason = text(p.reason, "Void reason", 255, true);
  const debt = ctx.data.debts.find((row) => row.sale_id === sale.id);
  if (debt) {
    ensure(
      !ctx.data.debt_payments.some(
        (payment) => payment.debt_id === debt.id && !payment.is_downpayment,
      ),
      "repayments_exist",
      "Reconcile later repayments before voiding this credit sale.",
    );
    debt.status = "voided";
    debt.balance = 0;
  }
  for (const item of ctx.data.sale_items.filter(
    (row) => row.sale_id === sale.id,
  )) {
    ctx.movement(
      ctx.product(item.product_id),
      item.qty,
      "return",
      reason,
      item.unit_cost,
      sale.id,
    );
  }
  const refund = sale.is_credit ? sale.cash_received : sale.total;
  if (refund > 0)
    ctx.cash("reversal", -refund, reason, { ref_sale_id: sale.id });
  sale.status = "voided";
  // Original timestamps and line-item prices remain immutable.
}
