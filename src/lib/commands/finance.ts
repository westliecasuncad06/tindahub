import { drawerBalance, type CommandContext } from "../command-context.ts";
import { boolean, calendarDate, cents, ensure, text } from "../validation.ts";
import { checkedCents } from "../money.ts";

export function saveExpense(ctx: CommandContext, p: Record<string, unknown>) {
  const amount = cents(p.amount);
  ensure(amount > 0, "invalid_amount", "Expense amount must be positive.");
  const expense = {
    id: ctx.id(),
    category: text(p.category, "Expense category", 80, true),
    description: text(p.description, "Description"),
    amount: amount / 100,
    expense_date: calendarDate(p.expense_date ?? ctx.today)!,
    from_drawer: boolean(p.from_drawer),
    created_at: ctx.at,
  };
  ctx.data.expenses.push(expense);
  if (expense.from_drawer)
    ctx.cash(
      "payout",
      -expense.amount,
      "Expense: " + (expense.description || expense.category),
      { expense_id: expense.id },
    );
}

export function deleteExpense(ctx: CommandContext, p: Record<string, unknown>) {
  const expense = ctx.data.expenses.find((row) => row.id === p.expense_id);
  ensure(expense, "missing_expense", "Expense does not exist.");
  if (expense.from_drawer)
    ctx.cash("reversal", expense.amount, "Expense refund", {
      expense_id: expense.id,
    });
  ctx.data.expenses = ctx.data.expenses.filter((row) => row.id !== expense.id);
}

export function recordDrawer(ctx: CommandContext, p: Record<string, unknown>) {
  const type = p.type;
  ensure(
    type === "opening" ||
      type === "deposit" ||
      type === "payout" ||
      type === "count",
    "invalid_drawer_type",
    "Drawer type is invalid.",
  );
  const amount = cents(p.amount);
  ensure(
    type === "opening" || type === "count" || amount > 0,
    "invalid_amount",
    "Drawer amount must be positive.",
  );
  if (type === "opening")
    ensure(
      !ctx.data.drawer.some(
        (entry) =>
          entry.type === "opening" && entry.business_date === ctx.today,
      ),
      "duplicate_opening",
      "An opening balance already exists for today.",
    );
  const note =
    text(p.note, "Drawer note") ||
    (type === "opening"
      ? "Opening balance"
      : type === "count"
        ? "Drawer count"
        : "Cash " + type);
  if (type === "count") {
    const variance = checkedCents(
      amount - Math.round(drawerBalance(ctx.data, ctx.today) * 100),
    );
    ctx.cash(type, 0, note, {
      actual_amount: amount / 100,
      variance: variance / 100,
    });
  } else ctx.cash(type, (type === "payout" ? -amount : amount) / 100, note);
}

export function updateSettings(
  ctx: CommandContext,
  p: Record<string, unknown>,
) {
  const limits = {
    store_name: 160,
    owner_name: 120,
    address: 255,
    phone: 30,
    receipt_footer: 255,
  } as const;
  for (const key of Object.keys(limits) as (keyof typeof limits)[]) {
    if (Object.hasOwn(p, key))
      ctx.data.settings[key] = text(
        p[key],
        key.replaceAll("_", " "),
        limits[key],
        key === "store_name",
      );
  }
  if (Object.hasOwn(p, "profit_target"))
    ctx.data.settings.profit_target =
      cents(p.profit_target, "Profit target") / 100;
}
