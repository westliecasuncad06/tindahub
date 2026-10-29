/** Shared data contract for the local demo and the Supabase adapter. */
export type ID = string;
export type Language = "en" | "tl";
export type Role = "owner" | "staff";
export type Category = {
  id: ID;
  name: string;
  color: string;
  sort_order: number;
};
export type Product = {
  id: ID;
  name: string;
  sku: string;
  category_id: ID | null;
  unit: string;
  cost_price: number;
  selling_price: number;
  stock_qty: number;
  reorder_level: number;
  is_active: boolean;
  expires_on: string | null;
  created_at: string;
};
export type Sale = {
  id: ID;
  receipt_no: string;
  subtotal: number;
  discount: number;
  total: number;
  cash_received: number;
  change_given: number;
  cogs_total: number;
  profit_total: number;
  status: "completed" | "voided";
  is_credit: boolean;
  customer_name: string;
  note: string;
  created_at: string;
  request_id: ID;
};
export type SaleItem = {
  id: ID;
  sale_id: ID;
  product_id: ID;
  product_name: string;
  qty: number;
  unit_price: number;
  unit_cost: number;
  line_total: number;
};
export type MovementType =
  "purchase" | "sale" | "adjustment" | "return" | "spoilage" | "count";
export type Movement = {
  id: ID;
  product_id: ID;
  type: MovementType;
  qty_change: number;
  qty_after: number;
  unit_cost: number;
  reason: string;
  created_at: string;
  ref_sale_id?: ID | null;
};
export type Debt = {
  id: ID;
  customer_name: string;
  customer_phone: string;
  sale_id: ID | null;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: "unpaid" | "partially_paid" | "paid" | "voided";
  due_date: string | null;
  notes: string;
  created_at: string;
};
export type DebtPayment = {
  id: ID;
  debt_id: ID;
  amount: number;
  payment_date: string;
  note: string;
  is_downpayment: boolean;
  created_at: string;
};
export type Expense = {
  id: ID;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  from_drawer: boolean;
  created_at: string;
};
export type DrawerEntry = {
  id: ID;
  type: "opening" | "sale" | "payout" | "deposit" | "count" | "reversal";
  amount: number;
  note: string;
  business_date: string;
  actual_amount?: number | null;
  ref_sale_id?: ID | null;
  expense_id?: ID | null;
  variance?: number | null;
  created_at: string;
};
export type StoreSettings = {
  store_name: string;
  owner_name: string;
  address: string;
  phone: string;
  receipt_footer: string;
  profit_target: number;
};
export type AppData = {
  version: 2;
  store_id: ID;
  role: Role;
  user_name?: string;
  settings: StoreSettings;
  stores?: { id: ID; name: string; role: Role }[];
  categories: Category[];
  products: Product[];
  sales: Sale[];
  sale_items: SaleItem[];
  movements: Movement[];
  debts: Debt[];
  debt_payments: DebtPayment[];
  expenses: Expense[];
  drawer: DrawerEntry[];
  /** Command ID -> canonical request. No secret or personal auth data belongs here. */
  processed_commands: Record<ID, string>;
};
export type CommandType =
  | "product.save"
  | "product.archive"
  | "category.save"
  | "stock.adjust"
  | "count.submit"
  | "sale.checkout"
  | "sale.void"
  | "debt.create"
  | "debt.pay"
  | "expense.save"
  | "expense.delete"
  | "drawer.record"
  | "settings.update"
  | "stock.repair";
/** Treat payload as untrusted at runtime, including payloads from forms. */
export type Command = {
  id: ID;
  type: CommandType;
  payload: Record<string, unknown>;
};
export type CartItem = { product_id: ID; qty: number };
export type CartTotals = {
  subtotal: number;
  discount: number;
  total: number;
  cogs_total: number;
  profit_total: number;
  items: { product: Product; qty: number; line_total: number }[];
};
export type DomainOptions = { now?: Date; createId?: () => ID };
