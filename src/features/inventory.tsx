"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  Plus,
  Minus,
  Pencil,
  History,
  Archive,
  Package,
  TriangleAlert,
  Boxes,
  ClipboardCheck,
  Check,
} from "lucide-react";
import { useStore } from "@/components/provider";
import {
  PageHeader,
  Metric,
  SearchInput,
  Empty,
  Field,
  FormDialog,
  Dialog,
  Badge,
  number,
  string,
  dateLabel,
} from "@/components/ui";
import { businessDate, money } from "@/lib/domain";
import { lineCents } from "@/lib/money";
import type { Product } from "@/lib/types";

export function Inventory() {
  const { data, t, execute, busy } = useStore();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("active");
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [prices, setPrices] = useState({ cost: 0, price: 0 });
  const [stock, setStock] = useState<{
    product: Product;
    direction: "add" | "remove";
  } | null>(null);
  const [history, setHistory] = useState<Product | null>(null);
  const [archive, setArchive] = useState<Product | null>(null);
  const [newCategory, setNewCategory] = useState(false);
  const active = data.products.filter((p) => p.is_active);
  const today = businessDate();
  const nextMonth = new Date(Date.parse(today + "T00:00:00Z") + 30 * 86400000)
    .toISOString()
    .slice(0, 10);
  const products = data.products.filter(
    (p) =>
      (status === "inactive" ? !p.is_active : p.is_active) &&
      (!search ||
        [p.name, p.sku].some((v) =>
          v.toLowerCase().includes(search.toLowerCase()),
        )) &&
      (category === "all" || p.category_id === category) &&
      (status !== "low" || p.stock_qty <= p.reorder_level) &&
      (status !== "out" || p.stock_qty === 0) &&
      (status !== "expiring" || (!!p.expires_on && p.expires_on <= nextMonth)),
  );
  const margin = prices.price
    ? ((prices.price - prices.cost) / prices.price) * 100
    : 0;
  function edit(product: Product | null) {
    setPrices({
      cost: product?.cost_price ?? 0,
      price: product?.selling_price ?? 0,
    });
    setEditing(product);
  }
  const actions = (p: Product) => (
    <div className="row-actions">
      <button
        className="icon-button"
        aria-label={"Edit " + p.name}
        title={t("Edit product", "I-edit ang paninda")}
        onClick={() => edit(p)}
      >
        <Pencil size={16} />
      </button>
      <button
        className="icon-button"
        aria-label={"Add stock " + p.name}
        title={t("Add stock", "Dagdag stock")}
        onClick={() => setStock({ product: p, direction: "add" })}
      >
        <Plus size={16} />
      </button>
      <button
        className="icon-button"
        aria-label={"Remove stock " + p.name}
        title={t("Remove stock", "Bawas stock")}
        onClick={() => setStock({ product: p, direction: "remove" })}
      >
        <Minus size={16} />
      </button>
      <button
        className="icon-button"
        aria-label={"Stock history " + p.name}
        title={t("Stock history", "Kasaysayan ng stock")}
        onClick={() => setHistory(p)}
      >
        <History size={16} />
      </button>
      {p.is_active && (
        <button
          className="icon-button"
          aria-label={"Archive " + p.name}
          title={t("Archive", "Itago ang paninda")}
          onClick={() => setArchive(p)}
        >
          <Archive size={16} />
        </button>
      )}
    </div>
  );
  return (
    <>
      <PageHeader
        eyebrow={t("EVERY SHELF, IN ORDER", "MAAYOS ANG BAWAT ISTANTE")}
        title={t("Your inventory, sorted.", "Ayos ang mga paninda.")}
        description={t(
          "Know what’s in stock, what’s running low, and what’s next.",
          "Alamin ang stock, mga paubos, at kailangang dagdagan.",
        )}
        actions={
          <>
            <Link className="button" href="/inventory/count">
              <ClipboardCheck size={17} />
              {t("Physical count", "Bilang ng paninda")}
            </Link>
            {data.role === "owner" && (
              <button
                className="button button-primary"
                onClick={() => edit(null)}
              >
                <Plus size={17} />
                {t("Add product", "Magdagdag ng paninda")}
              </button>
            )}
          </>
        }
      />
      <div className="metrics-grid three">
        <Metric
          label={t("Active products", "Aktibong paninda")}
          value={active.length}
          icon={Package}
        />
        <Metric
          label={t("Inventory cost value", "Halaga ng puhunan sa stock")}
          value={money(
            active.reduce(
              (sum, p) => sum + lineCents(p.cost_price, p.stock_qty) / 100,
              0,
            ),
          )}
          icon={Boxes}
          accent
        />
        <Metric
          label={t("Needs a restock", "Kailangang dagdagan")}
          value={active.filter((p) => p.stock_qty <= p.reorder_level).length}
          detail={t(
            "At or below your reorder level",
            "Nasa reorder level o mas mababa",
          )}
          icon={TriangleAlert}
        />
      </div>
      <section className="panel">
        <div className="panel-toolbar">
          <SearchInput
            label={t("Search inventory", "Hanapin sa imbentaryo")}
            value={search}
            onChange={setSearch}
          />
          <div className="filter-controls">
            <select
              aria-label={t("Filter category", "Salain ayon sa kategorya")}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">
                {t("All categories", "Lahat ng kategorya")}
              </option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              aria-label={t("Stock status", "Status ng stock")}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">
                {t("Active products", "Aktibong paninda")}
              </option>
              <option value="low">{t("Low stock", "Paubos na")}</option>
              <option value="out">{t("Sold out", "Ubos")}</option>
              <option value="expiring">
                {t("Expiring in 30 days", "Malapit mag-expire")}
              </option>
              <option value="inactive">{t("Archived", "Nakatago")}</option>
            </select>
          </div>
        </div>
        {!products.length ? (
          <Empty
            title={t("No products in this view", "Walang paninda rito")}
            description={t(
              "Adjust your filters or add your first product.",
              "Baguhin ang filter o magdagdag ng paninda.",
            )}
          />
        ) : (
          <div className="table-scroll">
            <table className="record-table inventory-table">
              <thead>
                <tr>
                  <th>{t("Product", "Paninda")}</th>
                  <th>{t("Stock", "Stock")}</th>
                  <th>{t("Cost", "Puhunan")}</th>
                  <th>{t("Price", "Presyo")}</th>
                  <th>{t("Margin", "Tubo %")}</th>
                  <th>{t("Status", "Status")}</th>
                  <th>{t("Actions", "Aksyon")}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="record-main">
                      <span className="table-product-icon">
                        <Package size={19} />
                      </span>
                      <span>
                        <strong>{p.name}</strong>
                        <small>
                          {p.sku || "—"} ·{" "}
                          {data.categories.find((c) => c.id === p.category_id)
                            ?.name || t("Uncategorized", "Walang kategorya")}
                          {p.expires_on && (
                            <span
                              className={p.expires_on < today ? "negative" : ""}
                            >
                              {" "}
                              · {t("Exp.", "Expiry")} {dateLabel(p.expires_on)}
                            </span>
                          )}
                        </small>
                      </span>
                    </td>
                    <td data-label={t("Stock", "Stock")}>
                      <strong>{p.stock_qty}</strong> <small>{p.unit}</small>
                    </td>
                    <td data-label={t("Cost", "Puhunan")}>
                      {money(p.cost_price)}
                    </td>
                    <td data-label={t("Price", "Presyo")}>
                      <strong>{money(p.selling_price)}</strong>
                    </td>
                    <td data-label={t("Margin", "Tubo %")}>
                      {p.selling_price
                        ? (
                            ((p.selling_price - p.cost_price) /
                              p.selling_price) *
                            100
                          ).toFixed(1)
                        : "0"}
                      %
                    </td>
                    <td>
                      <Badge
                        tone={
                          !p.stock_qty
                            ? "danger"
                            : p.stock_qty <= p.reorder_level
                              ? "warning"
                              : "success"
                        }
                      >
                        {!p.stock_qty
                          ? t("Sold out", "Ubos")
                          : p.stock_qty <= p.reorder_level
                            ? t("Low stock", "Paubos")
                            : t("In stock", "May stock")}
                      </Badge>
                    </td>
                    <td className="record-actions">
                      {data.role === "owner" ? (
                        actions(p)
                      ) : (
                        <button
                          className="text-button"
                          onClick={() => setHistory(p)}
                        >
                          {t("History", "Kasaysayan")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer className="panel-footer">
          {products.length} {t("products in this view", "paninda sa listahan")}
        </footer>
      </section>
      {editing !== undefined && (
        <FormDialog
          open
          onClose={() => setEditing(undefined)}
          title={
            editing
              ? t("Edit product", "I-edit ang paninda")
              : t("Add product", "Magdagdag ng paninda")
          }
          submit={t("Save product", "I-save ang paninda")}
          onSubmit={async (f, requestId) =>
            execute(
              "product.save",
              {
                ...(editing
                  ? { id: editing.id }
                  : { stock_qty: number(f, "stock_qty") }),
                name: string(f, "name"),
                sku: string(f, "sku"),
                category_id: string(f, "category_id") || null,
                unit: string(f, "unit"),
                cost_price: number(f, "cost_price"),
                selling_price: number(f, "selling_price"),
                reorder_level: number(f, "reorder_level"),
                expires_on: string(f, "expires_on") || null,
                is_active: f.get("is_active") === "on",
              },
              requestId,
            )
          }
        >
          <div className="full-width">
            <Field label={t("Product name", "Pangalan ng paninda")}>
              <input
                name="name"
                defaultValue={editing?.name}
                required
                maxLength={160}
              />
            </Field>
          </div>
          <Field label={t("SKU / barcode", "SKU / barcode")}>
            <input name="sku" defaultValue={editing?.sku} maxLength={40} />
          </Field>
          <Field label={t("Unit", "Yunit")}>
            <select name="unit" defaultValue={editing?.unit ?? "pcs"}>
              {[
                "pcs",
                "pack",
                "sachet",
                "bote",
                "kg",
                "g",
                "L",
                "mL",
                "kaha",
              ].map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label={t("Category", "Kategorya")}>
            <select
              name="category_id"
              defaultValue={editing?.category_id ?? ""}
            >
              <option value="">{t("Uncategorized", "Walang kategorya")}</option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="field align-bottom">
            <button
              type="button"
              className="button button-ghost"
              onClick={() => setNewCategory(true)}
            >
              <Plus size={15} />
              {t("New category", "Bagong kategorya")}
            </button>
          </div>
          <Field label={t("Cost price", "Presyo ng puhunan")}>
            <input
              name="cost_price"
              type="number"
              min="0"
              step="0.01"
              value={prices.cost}
              onChange={(e) =>
                setPrices({ ...prices, cost: Number(e.target.value) })
              }
              required
            />
          </Field>
          <Field label={t("Selling price", "Presyo ng benta")}>
            <input
              name="selling_price"
              type="number"
              min="0"
              step="0.01"
              value={prices.price}
              onChange={(e) =>
                setPrices({ ...prices, price: Number(e.target.value) })
              }
              required
            />
          </Field>
          <div className="profit-preview full-width">
            <span>
              {t("Profit per unit", "Tubo bawat yunit")}{" "}
              <strong>{money(prices.price - prices.cost)}</strong>
            </span>
            <Badge tone={margin < 0 ? "danger" : "success"}>
              {margin.toFixed(1)}% {t("margin", "margin")}
            </Badge>
          </div>
          {!editing && (
            <Field label={t("Opening stock", "Panimulang stock")}>
              <input
                name="stock_qty"
                type="number"
                min="0"
                step="0.001"
                defaultValue="0"
                required
              />
            </Field>
          )}
          <Field label={t("Reorder level", "Reorder level")}>
            <input
              name="reorder_level"
              type="number"
              min="0"
              step="0.001"
              defaultValue={editing?.reorder_level ?? 5}
              required
            />
          </Field>
          <Field
            label={t("Expiry date (optional)", "Petsa ng expiry (opsyonal)")}
          >
            <input
              name="expires_on"
              type="date"
              defaultValue={editing?.expires_on ?? ""}
            />
          </Field>
          <label className="checkbox-field full-width">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={editing?.is_active ?? true}
            />
            {t(
              "Available in the product catalog",
              "Ipakita sa listahan ng paninda",
            )}
          </label>
        </FormDialog>
      )}
      {newCategory && (
        <FormDialog
          open
          onClose={() => setNewCategory(false)}
          title={t("New category", "Bagong kategorya")}
          submit={t("Save category", "I-save ang kategorya")}
          onSubmit={(f, requestId) =>
            execute(
              "category.save",
              {
                name: string(f, "name"),
                color: string(f, "color"),
              },
              requestId,
            )
          }
        >
          <Field label={t("Category name", "Pangalan ng kategorya")}>
            <input name="name" required maxLength={80} />
          </Field>
          <Field label={t("Color", "Kulay")}>
            <input name="color" type="color" defaultValue="#ea580c" />
          </Field>
        </FormDialog>
      )}
      {stock && (
        <FormDialog
          open
          onClose={() => setStock(null)}
          title={
            (stock.direction === "add"
              ? t("Add stock", "Dagdag stock")
              : t("Remove stock", "Bawas stock")) +
            " · " +
            stock.product.name
          }
          submit={t("Save adjustment", "I-save ang pagbabago")}
          onSubmit={(f, requestId) =>
            execute(
              "stock.adjust",
              {
                product_id: stock.product.id,
                direction: stock.direction,
                qty: number(f, "qty"),
                unit_cost: number(f, "unit_cost"),
                update_cost_price: f.get("update_cost") === "on",
                reason: string(f, "reason"),
              },
              requestId,
            )
          }
        >
          <Field label={t("Quantity", "Dami")}>
            <input
              name="qty"
              type="number"
              min="0.001"
              step="0.001"
              defaultValue="1"
              required
            />
          </Field>
          <Field label={t("Unit cost", "Puhunan bawat yunit")}>
            <input
              name="unit_cost"
              type="number"
              min="0"
              step="0.01"
              defaultValue={stock.product.cost_price}
              required
            />
          </Field>
          <div className="full-width">
            <Field label={t("Reason", "Dahilan")}>
              <input name="reason" required maxLength={255} />
            </Field>
          </div>
          {stock.direction === "add" && (
            <label className="checkbox-field full-width">
              <input name="update_cost" type="checkbox" />
              {t(
                "Use this as the new cost price",
                "Gamitin bilang bagong presyo ng puhunan",
              )}
            </label>
          )}
        </FormDialog>
      )}
      {history && (
        <Dialog
          open
          onClose={() => setHistory(null)}
          title={
            t("Stock history", "Kasaysayan ng stock") + " · " + history.name
          }
          wide
        >
          <div className="dialog-body">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t("Date", "Petsa")}</th>
                    <th>{t("Type", "Uri")}</th>
                    <th>+/−</th>
                    <th>{t("After", "Pagkatapos")}</th>
                    <th>{t("Reason", "Dahilan")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.movements
                    .filter((m) => m.product_id === history.id)
                    .toReversed()
                    .map((m) => (
                      <tr key={m.id}>
                        <td>{dateLabel(m.created_at)}</td>
                        <td>{m.type}</td>
                        <td
                          className={m.qty_change < 0 ? "negative" : "positive"}
                        >
                          {m.qty_change > 0 ? "+" : ""}
                          {m.qty_change}
                        </td>
                        <td>{m.qty_after}</td>
                        <td>{m.reason}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </Dialog>
      )}
      {archive && (
        <Dialog
          open
          onClose={() => setArchive(null)}
          title={t("Archive this product?", "Itago ang panindang ito?")}
        >
          <div className="dialog-body">
            <p>{archive.name}</p>
            <p>
              {t(
                "This removes it from the POS catalog. Its stock and sales history are kept.",
                "Mawawala ito sa POS catalog. Mananatili ang stock at kasaysayan ng benta.",
              )}
            </p>
          </div>
          <footer className="dialog-footer">
            <button className="button" onClick={() => setArchive(null)}>
              {t("Cancel", "Kanselahin")}
            </button>
            <button
              className="button button-danger"
              disabled={busy}
              onClick={async () => {
                await execute("product.archive", { product_id: archive.id });
                setArchive(null);
              }}
            >
              {t("Archive product", "Itago ang paninda")}
            </button>
          </footer>
        </Dialog>
      )}
    </>
  );
}

export function PhysicalCount() {
  const { data, t, execute, busy } = useStore();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const expected = useRef<Record<string, number>>({});
  const request = useRef<string | null>(null);
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const products = data.products.filter((p) => p.is_active);
  const visible = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );
  const missing = products.reduce(
    (sum, p) =>
      sum +
      lineCents(
        p.cost_price,
        Math.round(
          Math.max(0, p.stock_qty - (counts[p.id] ?? p.stock_qty)) * 1000,
        ) / 1000,
      ) /
        100,
    0,
  );
  return (
    <>
      <PageHeader
        eyebrow={t("A FRESH LOOK AT THE SHELF", "TINGNAN ANG BAWAT ISTANTE")}
        title={t("Count what’s really there.", "Bilangin ang tunay na stock.")}
        description={t(
          "Enter physical quantities. Every count is saved in the stock ledger.",
          "Ilagay ang aktuwal na dami. Bawat bilang ay nakatala sa stock ledger.",
        )}
        actions={
          <Link href="/inventory" className="button">
            {t("Back to inventory", "Bumalik sa paninda")}
          </Link>
        }
      />
      <div className="count-callout">
        <ClipboardCheck size={25} />
        <div>
          <strong>
            {t(
              "Check each product before you submit.",
              "Tingnan ang bawat paninda bago i-save.",
            )}
          </strong>
          <p>
            {t(
              "Only observed quantities are saved. Use the check button to confirm a matching count; untouched products keep their current stock.",
              "Ang binilang lang ang ise-save. Pindutin ang check kung tugma ang bilang; mananatili ang stock ng hindi ginalaw.",
            )}
          </p>
        </div>
        <Badge tone="warning">
          {t("Missing stock cost", "Halaga ng kulang")}: {money(missing)}
        </Badge>
      </div>
      <section className="panel">
        <div className="panel-toolbar">
          <SearchInput
            label={t("Search products to count", "Hanapin ang bibilangin")}
            value={search}
            onChange={setSearch}
          />
          <span className="muted">
            {products.length} {t("products", "paninda")}
          </span>
        </div>
        <div className="table-scroll">
          <table className="record-table">
            <thead>
              <tr>
                <th>{t("Product", "Paninda")}</th>
                <th>{t("System quantity", "Dami sa sistema")}</th>
                <th>{t("Counted quantity", "Aktuwal na dami")}</th>
                <th>{t("Difference", "Diperensya")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td className="record-main">
                    <strong>{p.name}</strong>
                  </td>
                  <td data-label={t("System", "Sistema")}>
                    {p.stock_qty} {p.unit}
                  </td>
                  <td data-label={t("Counted", "Nabilang")}>
                    <input
                      className="count-input"
                      aria-label={"Count " + p.name}
                      type="number"
                      min="0"
                      step="0.001"
                      value={counts[p.id] ?? p.stock_qty}
                      onChange={(e) => {
                        expected.current[p.id] = p.stock_qty;
                        setCounts({
                          ...counts,
                          [p.id]: Number(e.target.value),
                        });
                        setSaved(false);
                      }}
                    />
                    <button
                      className="icon-button"
                      aria-label={"Confirm count " + p.name}
                      title={t(
                        "Confirm observed quantity",
                        "Kumpirmahin ang bilang",
                      )}
                      onClick={() => {
                        expected.current[p.id] = p.stock_qty;
                        setCounts({
                          ...counts,
                          [p.id]: counts[p.id] ?? p.stock_qty,
                        });
                        setSaved(false);
                      }}
                    >
                      <Check size={16} />
                    </button>
                  </td>
                  <td
                    data-label={t("Difference", "Diperensya")}
                    className={
                      (counts[p.id] ?? p.stock_qty) < p.stock_qty
                        ? "negative"
                        : "positive"
                    }
                  >
                    {Math.round(
                      ((counts[p.id] ?? p.stock_qty) - p.stock_qty) * 1000,
                    ) / 1000}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!products.length && (
          <Empty
            title={t(
              "No active products to count",
              "Walang aktibong panindang bibilangin",
            )}
          />
        )}
        <footer className="panel-footer count-footer">
          <span>
            {saved
              ? t(
                  "Count saved. Your ledger is up to date.",
                  "Na-save ang bilang. Na-update ang ledger.",
                )
              : error}
          </span>
          <button
            className="button button-primary"
            disabled={busy || !Object.keys(counts).length}
            onClick={async () => {
              setError("");
              try {
                request.current ??= crypto.randomUUID();
                await execute(
                  "count.submit",
                  {
                    items: Object.entries(counts).map(
                      ([product_id, counted_qty]) => ({
                        product_id,
                        counted_qty,
                        expected_stock_qty: expected.current[product_id],
                      }),
                    ),
                  },
                  request.current,
                );
                setCounts({});
                expected.current = {};
                request.current = null;
                setSaved(true);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Unable to save count.",
                );
              }
            }}
          >
            <ClipboardCheck size={17} />
            {t("Save physical count", "I-save ang bilang")}
          </button>
        </footer>
      </section>
    </>
  );
}
