import type { AppData, Command, DomainOptions } from "./types.ts";
import { canonical, ensure } from "./validation.ts";
import { commandContext } from "./command-context.ts";
import { checkout, createDebt, payDebt, voidSale } from "./commands/sales.ts";
import {
  adjustStock,
  repairStock,
  saveCategory,
  saveProduct,
  submitCount,
} from "./commands/inventory.ts";
import {
  deleteExpense,
  recordDrawer,
  saveExpense,
  updateSettings,
} from "./commands/finance.ts";

export { calculateCart } from "./cart.ts";
export { businessDate } from "./dates.ts";
export { money } from "./money.ts";
export { toCSV } from "./csv.ts";
export { drawerBalance } from "./command-context.ts";
export { auditStock } from "./commands/inventory.ts";
export { DomainError } from "./validation.ts";

const ownerOnly = new Set<Command["type"]>([
  "product.save",
  "product.archive",
  "category.save",
  "stock.adjust",
  "count.submit",
  "sale.void",
  "expense.delete",
  "settings.update",
  "stock.repair",
]);
const supported = new Set<Command["type"]>([
  ...ownerOnly,
  "sale.checkout",
  "debt.create",
  "debt.pay",
  "expense.save",
  "drawer.record",
]);

/**
 * Pure snapshot transaction used by the explicitly local demo.
 * Live stores must use the Postgres RPC implementation; client state is not authorization.
 */
export function applyCommand(
  source: AppData,
  command: Command,
  options: DomainOptions = {},
): AppData {
  ensure(
    command &&
      typeof command === "object" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        command.id,
      ),
    "invalid_request",
    "Request ID must be a UUID.",
  );
  ensure(
    supported.has(command.type),
    "invalid_command",
    "Unknown command type.",
  );
  ensure(
    command.payload &&
      typeof command.payload === "object" &&
      !Array.isArray(command.payload),
    "invalid_request",
    "Request payload must be an object.",
  );
  ensure(
    source.version === 2 &&
      (source.role === "owner" || source.role === "staff"),
    "invalid_state",
    "Store state is invalid.",
  );
  ensure(
    !ownerOnly.has(command.type) || source.role === "owner",
    "owner_required",
    "Only the store owner can perform this action.",
  );
  const signature = canonical({ type: command.type, payload: command.payload });
  if (Object.hasOwn(source.processed_commands, command.id)) {
    ensure(
      source.processed_commands[command.id] === signature,
      "request_conflict",
      "Request ID was already used for a different request.",
    );
    return structuredClone(source);
  }
  const data = structuredClone(source);
  const ctx = commandContext(data, options);
  const payload = command.payload;
  switch (command.type) {
    case "product.save":
      saveProduct(ctx, payload);
      break;
    case "product.archive":
      ctx.product(payload.product_id).is_active = false;
      break;
    case "category.save":
      saveCategory(ctx, payload);
      break;
    case "stock.adjust":
      adjustStock(ctx, payload);
      break;
    case "count.submit":
      submitCount(ctx, payload);
      break;
    case "sale.checkout":
      checkout(ctx, payload, command.id);
      break;
    case "sale.void":
      voidSale(ctx, payload);
      break;
    case "debt.create":
      createDebt(ctx, payload);
      break;
    case "debt.pay":
      payDebt(ctx, payload);
      break;
    case "expense.save":
      saveExpense(ctx, payload);
      break;
    case "expense.delete":
      deleteExpense(ctx, payload);
      break;
    case "drawer.record":
      recordDrawer(ctx, payload);
      break;
    case "settings.update":
      updateSettings(ctx, payload);
      break;
    case "stock.repair":
      repairStock(ctx, payload);
      break;
  }
  data.processed_commands[command.id] = signature;
  return data;
}
