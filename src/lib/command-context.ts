import type {
  AppData,
  DomainOptions,
  DrawerEntry,
  MovementType,
  Product,
} from "./types.ts";
import { businessDate } from "./dates.ts";
import { cents, ensure, mills, scaled } from "./validation.ts";
import { checkedCents } from "./money.ts";

export type CommandContext = ReturnType<typeof commandContext>;
export function commandContext(data: AppData, options: DomainOptions) {
  const now = options.now ?? new Date();
  const today = businessDate(now);
  const at = now.toISOString();
  const id = options.createId ?? (() => crypto.randomUUID());
  return {
    data,
    at,
    today,
    id,
    product(productId: unknown): Product {
      const product = data.products.find((row) => row.id === productId);
      ensure(product, "missing_product", "Product does not exist.");
      return product;
    },
    movement(
      product: Product,
      change: number,
      type: MovementType,
      reason: string,
      unitCost = product.cost_price,
      saleId: string | null = null,
    ) {
      const next =
        mills(product.stock_qty) +
        scaled(change, 3, "Quantity", -999_999_999.999);
      ensure(
        next >= 0 && next <= 999_999_999_999,
        "insufficient_stock",
        "Stock quantity would be outside the allowed range.",
      );
      product.stock_qty = next / 1000;
      data.movements.push({
        id: id(),
        product_id: product.id,
        type,
        qty_change: change,
        qty_after: product.stock_qty,
        unit_cost: unitCost,
        reason,
        ref_sale_id: saleId,
        created_at: at,
      });
    },
    cash(
      type: DrawerEntry["type"],
      amount: number,
      note: string,
      extra: Partial<DrawerEntry> = {},
    ) {
      const delta = scaled(amount, 2, "Drawer amount", -9_999_999_999.99);
      if (type !== "count")
        checkedCents(Math.round(drawerBalance(data, today) * 100) + delta);
      data.drawer.push({
        ...extra,
        id: id(),
        type,
        amount,
        note,
        business_date: today,
        created_at: at,
      });
    },
  };
}

/** Count observations never change expected cash. Reversals do. */
export function drawerBalance(data: AppData, date = businessDate()): number {
  return (
    checkedCents(
      data.drawer
        .filter(
          (entry) => entry.business_date === date && entry.type !== "count",
        )
        .reduce(
          (sum, entry) =>
            sum + scaled(entry.amount, 2, "Drawer amount", -9_999_999_999.99),
          0,
        ),
    ) / 100
  );
}

export function debtStatus(
  total: number,
  paid: number,
): "paid" | "partially_paid" | "unpaid" {
  return cents(paid) >= cents(total)
    ? "paid"
    : paid > 0
      ? "partially_paid"
      : "unpaid";
}
