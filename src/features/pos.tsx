"use client";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Banknote,
  BookOpen,
  Coffee,
  Utensils,
  Droplets,
  Package,
  Keyboard,
  Search,
} from "lucide-react";
import { useStore } from "@/components/provider";
import { PageHeader, Empty, Dialog, Badge, Field } from "@/components/ui";
import { Receipt } from "@/components/receipt";
import { calculateCart, money } from "@/lib/domain";
import type { CartItem, Product, Sale } from "@/lib/types";
import { lineCents } from "@/lib/money";

export function POS() {
  const { data, t, busy, execute } = useStore();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [mobileCart, setMobileCart] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [credit, setCredit] = useState(false);
  const [cash, setCash] = useState("");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const request = useRef<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const products = data.products.filter(
    (p) =>
      p.is_active &&
      (!search ||
        [p.name, p.sku].some((v) =>
          v.toLowerCase().includes(search.toLowerCase()),
        )) &&
      (category === "all" || p.category_id === category),
  );
  const totals = useMemo(() => {
    if (!cart.length) return null;
    try {
      return calculateCart(data.products, cart, discount);
    } catch {
      return null;
    }
  }, [cart, data.products, discount]);
  const frequent = useMemo(() => {
    const completed = new Set(
      data.sales.filter((s) => s.status === "completed").map((s) => s.id),
    );
    const quantities = new Map<string, number>();
    for (const item of data.sale_items)
      if (completed.has(item.sale_id))
        quantities.set(
          item.product_id,
          (quantities.get(item.product_id) ?? 0) + item.qty,
        );
    return [...quantities]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) =>
        data.products.find(
          (p) => p.id === id && p.is_active && p.stock_qty > 0,
        ),
      )
      .filter((p): p is Product => !!p)
      .slice(0, 5);
  }, [data.sales, data.sale_items, data.products]);
  function add(product: Product) {
    const current = cart.find((i) => i.product_id === product.id)?.qty ?? 0;
    const qty =
      Math.round((current + Math.min(1, product.stock_qty)) * 1000) / 1000;
    if (qty > product.stock_qty) {
      setError(
        t(
          "Not enough stock for this quantity.",
          "Kulang ang stock para sa daming ito.",
        ),
      );
      return;
    }
    request.current = null;
    setError("");
    setCart((previous) => {
      const found = previous.some((i) => i.product_id === product.id);
      return found
        ? previous.map((i) => (i.product_id === product.id ? { ...i, qty } : i))
        : [...previous, { product_id: product.id, qty }];
    });
  }
  function quantity(id: string, value: number) {
    const product = data.products.find((p) => p.id === id)!;
    if (!Number.isFinite(value) || value < 0 || value > product.stock_qty) {
      setError(
        t(
          "Check the available stock quantity.",
          "Pakitingnan ang dami ng available na stock.",
        ),
      );
      return;
    }
    request.current = null;
    setError("");
    setCart((items) =>
      value === 0
        ? items.filter((i) => i.product_id !== id)
        : items.map((i) =>
            i.product_id === id
              ? { ...i, qty: Math.round(value * 1000) / 1000 }
              : i,
          ),
    );
  }
  function openCheckout() {
    if (!totals) return;
    setError("");
    setMobileCart(false);
    setCheckout(true);
    request.current ??= crypto.randomUUID();
  }
  function newSale() {
    setReceipt(null);
    setCart([]);
    setDiscount(0);
    setCash("");
    setCredit(false);
    request.current = null;
  }
  const onKeyboard = useEffectEvent((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const input =
      event.target instanceof HTMLElement &&
      ["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName);
    if (event.key === "/" && !input) {
      event.preventDefault();
      searchRef.current?.focus();
    }
    if (event.key === "F2" && totals) {
      event.preventDefault();
      setCheckout(true);
      setMobileCart(false);
    }
    if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
      setCart([]);
      setDiscount(0);
      request.current = null;
    }
    if (
      !input &&
      !document.querySelector("dialog[open]") &&
      /^[1-9]$/.test(event.key)
    ) {
      const product = products[Number(event.key) - 1];
      if (product && product.stock_qty > 0) {
        event.preventDefault();
        add(product);
      }
    }
    if (event.key === " " && receipt) {
      event.preventDefault();
      newSale();
    }
  });
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => onKeyboard(event);
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);
  const cartPanel = (
    <div className="cart-panel">
      <header className="cart-heading">
        <div>
          <span className="eyebrow">
            {t("A LITTLE OF EVERYTHING", "MGA PINAMILI")}
          </span>
          <h2>
            {t("Current order", "Kasalukuyang order")}
            <span className="count-bubble">{cart.length}</span>
          </h2>
        </div>
        {cart.length > 0 && (
          <button
            className="icon-button"
            aria-label={t("Clear cart", "Alisin lahat")}
            onClick={() => {
              setCart([]);
              setDiscount(0);
              request.current = null;
            }}
          >
            <Trash2 size={17} />
          </button>
        )}
      </header>
      <div className="cart-lines">
        {!cart.length ? (
          <Empty
            title={t(
              "Your next sale starts here",
              "Simulan ang susunod na benta",
            )}
            description={t(
              "Tap a product to add it to the order.",
              "Pumili ng paninda para maidagdag sa order.",
            )}
          />
        ) : (
          cart.map((item) => {
            const p = data.products.find((p) => p.id === item.product_id)!;
            return (
              <div className="cart-line" key={p.id}>
                <span className="cart-product-icon">
                  <Package size={18} />
                </span>
                <div className="cart-line-main">
                  <strong>{p.name}</strong>
                  <small>
                    {money(p.selling_price)} / {p.unit}
                  </small>
                  <div className="quantity-stepper">
                    <button
                      aria-label={"Decrease " + p.name}
                      onClick={() => quantity(p.id, Math.max(0, item.qty - 1))}
                    >
                      <Minus size={13} />
                    </button>
                    <input
                      aria-label={"Quantity " + p.name}
                      type="number"
                      step="0.001"
                      min="0.001"
                      max={p.stock_qty}
                      value={item.qty}
                      onChange={(e) => quantity(p.id, Number(e.target.value))}
                    />
                    <button
                      aria-label={"Increase " + p.name}
                      onClick={() => quantity(p.id, item.qty + 1)}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
                <div className="cart-line-end">
                  <strong>
                    {money(lineCents(p.selling_price, item.qty) / 100)}
                  </strong>
                  <button
                    className="icon-button"
                    aria-label={"Remove " + p.name}
                    onClick={() => quantity(p.id, 0)}
                  >
                    <XIcon />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="cart-summary">
        <div className="summary-row">
          <span>{t("Subtotal", "Subtotal")}</span>
          <strong>{money(totals?.subtotal ?? 0)}</strong>
        </div>
        <div className="summary-row">
          <span>{t("Discount", "Tawad")}</span>
          <div className="discount-input">
            <span>₱</span>
            <input
              aria-label={t("Order discount", "Tawad sa order")}
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => {
                setDiscount(Number(e.target.value));
                request.current = null;
              }}
            />
          </div>
        </div>
        {cart.length > 0 && !totals && (
          <p className="form-error">
            {t(
              "Check quantities and discount before checkout.",
              "Tingnan ang dami at tawad bago magbayad.",
            )}
          </p>
        )}
        <div className="order-total">
          <span>{t("Total amount", "Kabuuang halaga")}</span>
          <strong>{money(totals?.total ?? 0)}</strong>
        </div>
        <button
          className="button button-primary checkout-button"
          onClick={openCheckout}
          disabled={!totals || busy}
        >
          {t("Checkout", "Bayaran")}
          <ArrowRight size={18} />
        </button>
        <p className="cart-safe-note">
          <Keyboard size={13} />
          {t("Press F2 to checkout", "Pindutin ang F2 para magbayad")}
        </p>
      </div>
    </div>
  );
  return (
    <>
      <PageHeader
        eyebrow={t(
          "GOOD BUSINESS, ONE SALE AT A TIME",
          "MAGANDANG NEGOSYO, BAWAT BENTA",
        )}
        title={t("Let’s make a sale.", "Tara, magbenta na.")}
        description={t(
          "Find a favorite, fill the basket, make someone’s day.",
          "Hanapin ang paninda at simulan ang magandang araw.",
        )}
      />
      <div className="pos-layout">
        <section className="catalog">
          <div className="catalog-toolbar">
            <div className="search-field">
              <Search size={18} />
              <input
                ref={searchRef}
                aria-label={t("Search products", "Maghanap ng paninda")}
                placeholder={t(
                  "Search products or scan a barcode…",
                  "Hanapin ang paninda o i-scan ang barcode…",
                )}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && products[0]) add(products[0]);
                }}
              />
              <kbd>/</kbd>
            </div>
            <Badge>
              {products.length} {t("products", "paninda")}
            </Badge>
          </div>
          <div className="category-tabs">
            <button
              className={category === "all" ? "selected" : ""}
              onClick={() => setCategory("all")}
            >
              <ShoppingBag size={15} />
              {t("All products", "Lahat ng paninda")}
            </button>
            {data.categories.map((c) => (
              <button
                key={c.id}
                className={category === c.id ? "selected" : ""}
                onClick={() => setCategory(c.id)}
              >
                <span
                  className="category-dot"
                  style={{ background: c.color }}
                />
                {c.name}
              </button>
            ))}
          </div>
          {!search && category === "all" && frequent.length > 0 && (
            <div className="frequent-section">
              <p>{t("Frequently picked", "Madalas bilhin")}</p>
              <div className="frequent-products">
                {frequent.map((p) => (
                  <button
                    key={p.id}
                    disabled={busy}
                    aria-label={t("Quick add ", "Mabilis na idagdag ") + p.name}
                    onClick={() => add(p)}
                  >
                    <Plus size={13} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {products.length ? (
            <div className="product-grid">
              {products.map((p) => {
                const c = data.categories.find((c) => c.id === p.category_id);
                const color = c?.color ?? "#ea580c";
                const Icon =
                  c?.sort_order === 1
                    ? Coffee
                    : c?.sort_order === 2
                      ? Droplets
                      : Utensils;
                return (
                  <button
                    key={p.id}
                    className={
                      "product-card " + (!p.stock_qty ? "sold-out" : "")
                    }
                    aria-label={"Add " + p.name}
                    disabled={!p.stock_qty || busy}
                    onClick={() => add(p)}
                  >
                    <div
                      className="product-visual"
                      style={
                        { "--product-color": color } as React.CSSProperties
                      }
                    >
                      <Icon size={42} strokeWidth={1.3} />
                      <span className="product-unit">{p.unit}</span>
                      <span className="product-add">
                        <Plus size={18} />
                      </span>
                    </div>
                    <div className="product-info">
                      <small>
                        {c?.name ?? t("Uncategorized", "Walang kategorya")}
                      </small>
                      <h3>{p.name}</h3>
                      <div className="product-bottom">
                        <strong>{money(p.selling_price)}</strong>
                        <span
                          className={
                            !p.stock_qty
                              ? "stock-out"
                              : p.stock_qty <= p.reorder_level
                                ? "stock-low"
                                : ""
                          }
                        >
                          <span className="status-dot" />
                          {!p.stock_qty
                            ? t("Sold out", "Ubos")
                            : p.stock_qty + " " + t("left", "natitira")}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <Empty
              title={t("No products found", "Walang nahanap na paninda")}
              description={t(
                "Try another search or add products in Inventory.",
                "Subukang maghanap muli o magdagdag sa Mga paninda.",
              )}
            />
          )}
        </section>
        <aside className="desktop-cart">{cartPanel}</aside>
      </div>
      <button
        className="mobile-cart-button button button-primary"
        disabled={!cart.length}
        onClick={() => setMobileCart(true)}
      >
        <ShoppingBag size={19} />
        <span>
          {t("View cart", "Tingnan ang cart")} ({cart.length})
        </span>
        <strong>{money(totals?.total ?? 0)}</strong>
        <ArrowRight size={17} />
      </button>
      <Dialog
        open={mobileCart}
        onClose={() => setMobileCart(false)}
        title={t("Your order", "Mga pinamili")}
      >
        {cartPanel}
      </Dialog>
      <Dialog
        open={checkout}
        onClose={() => setCheckout(false)}
        title={t("Complete your sale", "Kumpletuhin ang benta")}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!totals) return;
            const f = new FormData(e.currentTarget);
            setError("");
            try {
              request.current ??= crypto.randomUUID();
              const result = await execute(
                "sale.checkout",
                {
                  items: cart,
                  discount,
                  is_credit: credit,
                  ...(credit
                    ? {
                        customer_name: String(f.get("customer_name")),
                        customer_phone: String(f.get("customer_phone") || ""),
                        downpayment: Number(cash || 0),
                        due_date: String(f.get("due_date") || ""),
                      }
                    : { cash: Number(cash || 0) }),
                },
                request.current,
              );
              setReceipt(
                result.sales.find((s) => s.request_id === request.current) ??
                  null,
              );
              setCheckout(false);
              setCart([]);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Please try again.");
            }
          }}
        >
          <div className="dialog-body">
            <div className="checkout-total">
              <small>{t("TOTAL TO PAY", "KABUUANG BAYARAN")}</small>
              <strong>{money(totals?.total ?? 0)}</strong>
            </div>
            <div className="payment-tabs">
              <button
                type="button"
                className={!credit ? "selected" : ""}
                onClick={() => {
                  setCredit(false);
                  setCash("");
                }}
              >
                <Banknote size={18} />
                {t("Cash", "Cash")}
              </button>
              <button
                type="button"
                className={credit ? "selected" : ""}
                onClick={() => {
                  setCredit(true);
                  setCash("");
                }}
              >
                <BookOpen size={18} />
                {t("Customer credit", "Pautang")}
              </button>
            </div>
            {credit && (
              <div className="form-grid">
                <Field label={t("Customer name", "Pangalan ng kostumer")}>
                  <input name="customer_name" required maxLength={120} />
                </Field>
                <Field label={t("Phone (optional)", "Telepono (opsyonal)")}>
                  <input name="customer_phone" maxLength={30} />
                </Field>
                <Field
                  label={t(
                    "Due date (optional)",
                    "Petsa ng singilan (opsyonal)",
                  )}
                >
                  <input type="date" name="due_date" />
                </Field>
              </div>
            )}
            <Field
              label={
                credit
                  ? t("Downpayment", "Paunang bayad")
                  : t("Cash received", "Bayad ng kostumer")
              }
            >
              <input
                className="cash-input"
                type="number"
                step="0.01"
                min={credit ? 0 : (totals?.total ?? 0)}
                max={credit ? totals?.total : undefined}
                required
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                autoFocus
              />
            </Field>
            {!credit && (
              <div className="quick-cash">
                {[50, 100, 200, 500, 1000].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCash(String(value))}
                  >
                    ₱{value}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCash(String(totals?.total ?? 0))}
                >
                  {t("Exact", "Sakto")}
                </button>
              </div>
            )}
            <div className="change-display">
              <span>
                {credit
                  ? t("Credit balance", "Balanse na utang")
                  : t("Change", "Sukli")}
              </span>
              <strong>
                {money(
                  Math.max(
                    0,
                    Math.round(
                      ((credit ? (totals?.total ?? 0) : Number(cash || 0)) -
                        (credit ? Number(cash || 0) : (totals?.total ?? 0))) *
                        100,
                    ) / 100,
                  ),
                )}
              </strong>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <footer className="dialog-footer">
            <button
              type="button"
              className="button"
              onClick={() => setCheckout(false)}
            >
              {t("Back", "Bumalik")}
            </button>
            <button
              className="button button-primary"
              disabled={busy || !totals}
            >
              {busy
                ? t("Processing…", "Ipinoproseso…")
                : t("Complete sale", "Kumpletuhin ang benta")}
              <ArrowRight size={17} />
            </button>
          </footer>
        </form>
      </Dialog>
      <Receipt sale={receipt} success onClose={newSale} />
    </>
  );
}
function XIcon() {
  return <Trash2 size={14} />;
}
