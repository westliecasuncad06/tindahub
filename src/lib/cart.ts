import type { CartItem, CartTotals, Product } from "./types.ts";
import { cents, ensure, mills, rows, text } from "./validation.ts";
import { checkedCents, lineCents } from "./money.ts";

export function calculateCart(products: Product[], items: CartItem[], discount = 0): CartTotals {
  ensure(Array.isArray(items) && items.length > 0, "empty_cart", "Cart is empty.");
  const quantities = new Map<string, number>();
  for (const item of rows(items, "Cart")) {
    const id = text(item.product_id, "Product", 80, true);
    const quantity = mills(item.qty);
    ensure(quantity > 0, "invalid_quantity", "Quantity must be positive.");
    const combined = (quantities.get(id) ?? 0) + quantity;
    ensure(Number.isSafeInteger(combined) && combined <= 999_999_999_999, "invalid_quantity", "Quantity exceeds the database limit.");
    quantities.set(id, combined);
  }
  let subtotal = 0;
  let cogs = 0;
  const lines = [...quantities].map(([id, quantity]) => {
    const product = products.find((row) => row.id === id && row.is_active);
    ensure(product, "missing_product", "Product is unavailable.");
    ensure(quantity <= mills(product.stock_qty), "insufficient_stock", "Insufficient stock for " + product.name + ".");
    const qty = quantity / 1000;
    const line = lineCents(product.selling_price, qty);
    subtotal = checkedCents(subtotal + line);
    cogs = checkedCents(cogs + lineCents(product.cost_price, qty));
    return { product: { ...product }, qty, line_total: line / 100 };
  });
  const discountCents = cents(discount, "Discount");
  ensure(discountCents <= subtotal, "invalid_discount", "Discount cannot exceed the subtotal.");
  return { subtotal: subtotal / 100, discount: discountCents / 100, total: (subtotal - discountCents) / 100, cogs_total: cogs / 100, profit_total: (subtotal - discountCents - cogs) / 100, items: lines };
}
