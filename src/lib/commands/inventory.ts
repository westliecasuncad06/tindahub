import type { CommandContext } from "../command-context.ts";
import type { AppData, Product } from "../types.ts";
import {
  boolean,
  calendarDate,
  cents,
  ensure,
  mills,
  rows,
  scaled,
  text,
} from "../validation.ts";

const units = new Set([
  "pcs",
  "kg",
  "g",
  "L",
  "mL",
  "pack",
  "sachet",
  "bote",
  "kaha",
]);

export function saveCategory(ctx: CommandContext, p: Record<string, unknown>) {
  const existing =
    p.id === undefined
      ? undefined
      : ctx.data.categories.find((row) => row.id === p.id);
  ensure(
    p.id === undefined || existing,
    "missing_category",
    "Category does not exist.",
  );
  const name = text(p.name ?? existing?.name, "Category name", 80, true);
  ensure(
    !ctx.data.categories.some(
      (row) =>
        row.id !== existing?.id &&
        row.name.toLowerCase() === name.toLowerCase(),
    ),
    "duplicate_category",
    "Category name already exists.",
  );
  const color = text(p.color ?? existing?.color ?? "#ea580c", "Color", 7, true);
  ensure(
    /^#[0-9a-f]{6}$/i.test(color),
    "invalid_color",
    "Color must be a hex color.",
  );
  const sort = p.sort_order ?? existing?.sort_order ?? 0;
  ensure(
    typeof sort === "number" &&
      Number.isInteger(sort) &&
      sort >= 0 &&
      sort <= 32767,
    "invalid_sort",
    "Category sort order is invalid.",
  );
  const category = {
    id: existing?.id ?? ctx.id(),
    name,
    color,
    sort_order: sort,
  };
  if (existing) Object.assign(existing, category);
  else ctx.data.categories.push(category);
}

export function saveProduct(ctx: CommandContext, p: Record<string, unknown>) {
  const existing = p.id === undefined ? undefined : ctx.product(p.id);
  const value = { ...existing, ...p };
  const name = text(value.name, "Product name", 160, true);
  const sku = text(value.sku, "SKU", 40);
  ensure(
    !sku ||
      !ctx.data.products.some(
        (row) =>
          row.id !== existing?.id &&
          row.sku.toLowerCase() === sku.toLowerCase(),
      ),
    "duplicate_sku",
    "SKU already exists.",
  );
  const categoryId = value.category_id || null;
  ensure(
    categoryId === null ||
      ctx.data.categories.some((row) => row.id === categoryId),
    "missing_category",
    "Category does not exist.",
  );
  const unit = text(
    value.unit === undefined ? "pcs" : value.unit,
    "Unit",
    10,
    true,
  );
  ensure(units.has(unit), "invalid_unit", "Product unit is invalid.");
  const quantity = mills(value.stock_qty === undefined ? 0 : value.stock_qty);
  ensure(
    !existing || quantity === mills(existing.stock_qty),
    "direct_stock_edit",
    "Change stock using an adjustment or a physical count.",
  );
  const product: Product = {
    id: existing?.id ?? ctx.id(),
    name,
    sku,
    category_id: categoryId as string | null,
    unit,
    cost_price:
      cents(
        value.cost_price === undefined ? 0 : value.cost_price,
        "Cost price",
      ) / 100,
    selling_price:
      cents(
        value.selling_price === undefined ? 0 : value.selling_price,
        "Selling price",
      ) / 100,
    stock_qty: existing?.stock_qty ?? 0,
    reorder_level:
      mills(
        value.reorder_level === undefined ? 5 : value.reorder_level,
        "Reorder level",
      ) / 1000,
    is_active: boolean(value.is_active, true),
    expires_on: calendarDate(value.expires_on, true),
    created_at: existing?.created_at ?? ctx.at,
  };
  if (existing) Object.assign(existing, product);
  else {
    ctx.data.products.push(product);
    if (quantity > 0)
      ctx.movement(product, quantity / 1000, "purchase", "Opening stock");
  }
}

export function adjustStock(ctx: CommandContext, p: Record<string, unknown>) {
  const product = ctx.product(p.product_id);
  const quantity = mills(p.qty);
  ensure(quantity > 0, "invalid_quantity", "Quantity must be positive.");
  ensure(
    p.direction === "add" || p.direction === "remove",
    "invalid_direction",
    "Choose add or remove stock.",
  );
  const reason = text(p.reason, "Stock adjustment reason", 255, true);
  const unitCost =
    p.unit_cost === undefined
      ? product.cost_price
      : cents(p.unit_cost, "Unit cost") / 100;
  const updateCost = boolean(p.update_cost_price);
  ensure(
    !updateCost || p.direction === "add",
    "invalid_cost_update",
    "Only a stock delivery can update the cost price.",
  );
  ctx.movement(
    product,
    ((p.direction === "add" ? 1 : -1) * quantity) / 1000,
    p.direction === "add" ? "purchase" : "spoilage",
    reason,
    unitCost,
  );
  if (updateCost) product.cost_price = unitCost;
}

export function submitCount(ctx: CommandContext, p: Record<string, unknown>) {
  const seen = new Set<string>();
  for (const item of rows(p.items, "Physical count")) {
    const product = ctx.product(item.product_id);
    if (item.expected_stock_qty !== undefined)
      ensure(
        mills(item.expected_stock_qty) === mills(product.stock_qty),
        "stale_count",
        "Stock changed while counting. Refresh and observe this product again.",
      );
    ensure(
      !seen.has(product.id),
      "duplicate_count",
      "Duplicate product in physical count.",
    );
    seen.add(product.id);
    const actual = mills(item.counted_qty, "Counted quantity");
    const difference = actual - mills(product.stock_qty);
    ctx.movement(
      product,
      difference / 1000,
      "count",
      text(p.reason, "Count reason") || "Physical count",
    );
  }
}

export function auditStock(data: AppData) {
  const quantities = new Map<string, number>();
  for (const movement of data.movements) {
    const quantity = scaled(
      movement.qty_change,
      3,
      "Ledger quantity",
      -999_999_999.999,
    );
    quantities.set(
      movement.product_id,
      (quantities.get(movement.product_id) ?? 0) + quantity,
    );
  }
  return data.products.flatMap((product) => {
    const ledger = quantities.get(product.id) ?? 0;
    const difference = mills(product.stock_qty) - ledger;
    return difference === 0
      ? []
      : [
          {
            product_id: product.id,
            product_name: product.name,
            stock_qty: product.stock_qty,
            ledger_qty: ledger / 1000,
            difference: difference / 1000,
          },
        ];
  });
}

export function repairStock(ctx: CommandContext, p: Record<string, unknown>) {
  const reason = text(p.reason, "Repair reason", 255, true);
  if (p.product_id !== undefined) ctx.product(p.product_id);
  for (const mismatch of auditStock(ctx.data).filter(
    (row) => p.product_id === undefined || row.product_id === p.product_id,
  )) {
    const product = ctx.product(mismatch.product_id);
    ctx.data.movements.push({
      id: ctx.id(),
      product_id: product.id,
      type: "adjustment",
      qty_change: mismatch.difference,
      qty_after: product.stock_qty,
      unit_cost: product.cost_price,
      reason: "Ledger repair: " + reason,
      created_at: ctx.at,
    });
  }
}
