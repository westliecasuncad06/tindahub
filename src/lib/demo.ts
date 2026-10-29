import type { AppData, CommandType, DomainOptions } from "./types.ts";
import { applyCommand } from "./domain.ts";
import { businessDate } from "./dates.ts";
import { ensure } from "./validation.ts";

/** All identities and transactions in this fixture are fictional. */
export function createDemoData(now = new Date()): AppData {
  ensure(Number.isFinite(now.getTime()), "invalid_date", "Invalid demo date.");
  let sequence = 0;
  const id = () => "00000000-0000-4000-8000-" + (++sequence).toString().padStart(12, "0");
  let data: AppData = {
    version: 2, store_id: id(), role: "owner",
    settings: { store_name: "TindaHub Demo Store", owner_name: "Demo Owner", address: "Sample store address", phone: "", receipt_footer: "Salamat po! Balik kayo ulit.", profit_target: 1000 },
    categories: [
      { id: id(), name: "Food & snacks", color: "#ea580c", sort_order: 0 },
      { id: id(), name: "Drinks", color: "#0284c7", sort_order: 1 },
      { id: id(), name: "Home essentials", color: "#16a34a", sort_order: 2 }
    ],
    products: [], sales: [], sale_items: [], movements: [], debts: [], debt_payments: [], expenses: [], drawer: [], processed_commands: {}
  };
  const samples: [string, number, number, number, number, string][] = [
    ["Lucky Me Pancit Canton", 0, 12, 15, 72, "pack"], ["Kopiko Brown Coffee", 1, 6, 8, 120, "sachet"],
    ["Nescafé Original", 1, 6.5, 9, 90, "sachet"], ["Coca-Cola 290 mL", 1, 14, 18, 64, "bote"],
    ["Piattos Cheese", 0, 14, 18, 36, "pack"], ["Oishi Prawn Crackers", 0, 7, 10, 42, "pack"],
    ["SkyFlakes Crackers", 0, 6, 8, 60, "pack"], ["Rebisco Sandwich", 0, 6, 8, 48, "pack"],
    ["Silver Swan Soy Sauce", 0, 8, 11, 20, "sachet"], ["Datu Puti Vinegar", 0, 7, 10, 18, "sachet"],
    ["Century Tuna Flakes", 0, 29, 35, 15, "pcs"], ["Argentina Corned Beef", 0, 30, 38, 12, "pcs"],
    ["Jasmine Rice", 0, 46, 55, 30.5, "kg"], ["Brown Sugar", 0, 68, 80, 12.75, "kg"],
    ["Gardenia Bread", 0, 38, 45, 8, "pack"], ["Egg", 0, 6, 8, 120, "pcs"],
    ["Mineral Water 500 mL", 1, 8, 12, 40, "bote"], ["Zesto Orange", 1, 8, 12, 24, "pack"],
    ["Milo", 1, 8, 11, 48, "sachet"], ["Bear Brand Milk", 1, 10, 14, 36, "sachet"],
    ["Surf Powder", 2, 6, 8, 60, "sachet"], ["Downy Fabric Conditioner", 2, 7, 10, 45, "sachet"],
    ["Safeguard Soap", 2, 19, 25, 18, "pcs"], ["Sunsilk Shampoo", 2, 5, 7, 80, "sachet"],
    ["Colgate Toothpaste", 2, 6, 9, 25, "sachet"], ["Joy Dishwashing Liquid", 2, 6, 9, 32, "sachet"],
    ["Tissue Roll", 2, 10, 15, 4, "pcs"], ["Bottled Iced Tea", 1, 18, 25, 3, "bote"],
    ["Chocolate Wafer", 0, 5, 7, 0, "pack"], ["Cooking Oil", 0, 65, 80, 10.5, "L"]
  ];
  const initial = new Date(now.getTime() - 15 * 86_400_000);
  const run = (type: CommandType, payload: Record<string, unknown>, at: Date) => {
    const options: DomainOptions = { now: at, createId: id };
    data = applyCommand(data, { id: id(), type, payload }, options);
  };
  for (const [index, [name, category, cost, price, stock, unit]] of samples.entries()) {
    run("product.save", { name, sku: "DEMO-" + (index + 1).toString().padStart(3, "0"), category_id: data.categories[category].id, cost_price: cost, selling_price: price, stock_qty: stock, unit, reorder_level: 5 }, initial);
  }
  for (let days = 13; days >= 0; days--) {
    const at = new Date(now.getTime() - days * 86_400_000);
    run("drawer.record", { type: "opening", amount: 500 }, at);
    for (let sale = 0; sale < 4; sale++) {
      const product = data.products[(days * 3 + sale) % 24];
      run("sale.checkout", { items: [{ product_id: product.id, qty: 1 }], cash: 100 }, at);
    }
  }
  run("sale.checkout", { items: [{ product_id: data.products[0].id, qty: 2 }], is_credit: true, customer_name: "Sample Customer A", downpayment: 10 }, now);
  run("debt.create", { customer_name: "Sample Customer B", total_amount: 250, downpayment: 50 }, now);
  run("expense.save", { category: "Transport", description: "Sample delivery fare", amount: 40, expense_date: businessDate(now), from_drawer: true }, now);
  return data;
}
