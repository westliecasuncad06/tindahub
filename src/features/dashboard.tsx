"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  ShoppingBag,
  Wallet,
  TrendingUp,
  ReceiptText,
  Package,
  Eye,
  RotateCcw,
} from "lucide-react";
import { useStore } from "@/components/provider";
import {
  PageHeader,
  Metric,
  Empty,
  Badge,
  FormDialog,
  Field,
  string,
  dateLabel,
} from "@/components/ui";
import { Receipt } from "@/components/receipt";
import { businessDate, money } from "@/lib/domain";
import { summarize, reportTable, inRange } from "@/lib/reporting";
import type { Sale } from "@/lib/types";
export function Dashboard() {
  const { data, t, execute } = useStore();
  const today = businessDate();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [voiding, setVoiding] = useState<Sale | null>(null);
  const stats = summarize(data, from, to);
  const rows = reportTable(data, "profit", from, to).rows;
  const recent = data.sales
    .filter((s) => inRange(businessDate(new Date(s.created_at)), from, to))
    .toReversed();
  const completed = new Set(
    recent.filter((s) => s.status === "completed").map((s) => s.id),
  );
  const quantity = new Map<string, number>();
  for (const item of data.sale_items)
    if (completed.has(item.sale_id))
      quantity.set(
        item.product_id,
        (quantity.get(item.product_id) ?? 0) + item.qty,
      );
  const top = [...quantity].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const low = data.products
    .filter((p) => p.is_active && p.stock_qty <= p.reorder_level)
    .sort((a, b) => a.stock_qty - b.stock_qty)
    .slice(0, 4);
  const days = Math.max(
    1,
    Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) +
      1,
  );
  const target = data.settings.profit_target * days;
  const progress = target
    ? Math.max(0, Math.min(100, (stats.net / target) * 100))
    : 0;
  return (
    <>
      <PageHeader
        eyebrow={t(
          "THE BIG PICTURE, MADE SIMPLE",
          "MALINAW NA TINGIN SA NEGOSYO",
        )}
        title={t("A good day for business.", "Magandang araw sa negosyo.")}
        description={t(
          "Here’s how your store is doing. Every number tells a story.",
          "Narito ang takbo ng tindahan. Bawat numero ay may kuwento.",
        )}
        actions={
          <Link href="/pos" className="button button-primary">
            <ShoppingBag size={17} />
            {t("Make a sale", "Magbenta")}
            <ArrowUpRight size={17} />
          </Link>
        }
      />
      <div className="range-toolbar">
        <div className="segmented">
          {[
            ["Today", "Ngayon", 0],
            ["7 days", "7 araw", 6],
            ["This month", "Ngayong buwan", -1],
          ].map(([en, tl, days]) => (
            <button
              key={en}
              className={
                to === today &&
                from ===
                  (days === -1
                    ? today.slice(0, 7) + "-01"
                    : new Date(
                        Date.parse(today + "T00:00:00Z") -
                          Number(days) * 86400000,
                      )
                        .toISOString()
                        .slice(0, 10))
                  ? "selected"
                  : ""
              }
              onClick={() => {
                setTo(today);
                setFrom(
                  days === -1
                    ? today.slice(0, 7) + "-01"
                    : new Date(
                        Date.parse(today + "T00:00:00Z") -
                          Number(days) * 86400000,
                      )
                        .toISOString()
                        .slice(0, 10),
                );
              }}
            >
              {t(String(en), String(tl))}
            </button>
          ))}
        </div>
        <div className="date-range">
          <input
            aria-label={t("Overview from", "Buod mula")}
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span>—</span>
          <input
            aria-label={t("Overview to", "Buod hanggang")}
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>
      <div className="metrics-grid three">
        <Metric
          label={t("Total sales", "Kabuuang benta")}
          value={money(stats.sales)}
          detail={stats.count + " " + t("completed sales", "kumpletong benta")}
          icon={ShoppingBag}
        />
        <Metric
          label={t("Gross profit", "Kabuuang tubo")}
          value={money(stats.profit)}
          detail={t("After the cost of goods", "Matapos ibawas ang puhunan")}
          icon={TrendingUp}
        />
        <Metric
          label={t("Net profit", "Netong kita")}
          value={money(stats.net)}
          detail={t(
            "Gross profit less expenses",
            "Tubo matapos ibawas ang gastos",
          )}
          icon={Wallet}
          accent
        />
        <Metric
          label={t("Cost of goods", "Puhunan ng naibenta")}
          value={money(stats.cost)}
          icon={Package}
        />
        <Metric
          label={t("Operating expenses", "Mga gastos")}
          value={money(stats.expenses)}
          icon={ReceiptText}
        />
        <Metric
          label={t("Average sale", "Karaniwang halaga ng benta")}
          value={money(stats.average)}
          detail={t(
            "Per completed transaction",
            "Bawat kumpletong transaksyon",
          )}
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>
                {t("A little growth, every day.", "Pag-unlad, araw-araw.")}
              </h2>
              <p>
                {t(
                  "Sales and gross profit for the selected period.",
                  "Benta at tubo para sa napiling panahon.",
                )}
              </p>
            </div>
            <div className="chart-legend">
              <span>
                <i />
                {t("Sales", "Benta")}
              </span>
              <span>
                <i />
                {t("Gross profit", "Tubo")}
              </span>
            </div>
          </div>
          <SalesChart rows={rows} />
        </section>
        <section className="panel target-panel">
          <span className="eyebrow">
            {t("ONE GOAL AT A TIME", "ISANG LAYUNIN BAWAT HAKBANG")}
          </span>
          <h2>
            {t(
              "Keep your next goal in sight.",
              "Abutin ang susunod na layunin.",
            )}
          </h2>
          <div className="target-value">
            <strong>
              {Math.round(progress)}
              <small>%</small>
            </strong>
            <span>
              {t("of your net profit target", "ng target na netong kita")}
            </span>
          </div>
          <div className="progress-track">
            <span style={{ width: progress + "%" }} />
          </div>
          <div className="summary-row">
            <strong>{money(stats.net)}</strong>
            <span>
              {t("of", "sa")} {money(target)}
            </span>
          </div>
          <Link href="/settings" className="text-link">
            {t("Adjust your daily target", "Baguhin ang arawang target")}
            <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{t("Neighborhood favorites", "Paborito sa komunidad")}</h2>
              <p>
                {t(
                  "Top products by quantity sold in this period.",
                  "Mga panindang may pinakamaraming nabentang dami.",
                )}
              </p>
            </div>
          </div>
          {!top.length ? (
            <Empty
              title={t(
                "Your next bestseller is waiting",
                "Naghihintay ang susunod na bestseller",
              )}
            />
          ) : (
            <ol className="top-products">
              {top.map(([id, qty], i) => {
                const p = data.products.find((p) => p.id === id);
                return (
                  <li key={id}>
                    <span className="rank">0{i + 1}</span>
                    <span className="table-product-icon">
                      <Package size={20} />
                    </span>
                    <div>
                      <strong>{p?.name ?? "Product"}</strong>
                      <small>{p?.sku}</small>
                    </div>
                    <strong>
                      {qty} <small>{p?.unit}</small>
                    </strong>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{t("A shelf check", "Tingnan ang mga istante")}</h2>
              <p>
                {t(
                  "These products could use a top-up.",
                  "Maaaring dagdagan ang mga panindang ito.",
                )}
              </p>
            </div>
            <Link className="text-link" href="/inventory">
              {t("View all", "Tingnan lahat")}
              <ArrowUpRight size={15} />
            </Link>
          </div>
          {!low.length ? (
            <Empty title={t("All stocked up", "Sapat ang stock")} />
          ) : (
            <ul className="activity-list">
              {low.map((p) => (
                <li key={p.id}>
                  <span className="activity-icon">
                    <Package size={19} />
                  </span>
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {t("Reorder at", "Dagdagan sa")} {p.reorder_level}{" "}
                      {p.unit}
                    </small>
                  </div>
                  <Badge tone={p.stock_qty ? "warning" : "danger"}>
                    {p.stock_qty} {t("left", "natitira")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{t("Every sale has a story", "Bawat benta ay may kuwento")}</h2>
            <p>
              {t(
                "Recent transactions in your selected period.",
                "Mga huling transaksyon sa napiling panahon.",
              )}
            </p>
          </div>
          <Badge>
            {recent.length} {t("records", "tala")}
          </Badge>
        </div>
        {!recent.length ? (
          <Empty
            title={t("No sales in this period", "Walang benta sa panahong ito")}
          />
        ) : (
          <div className="table-scroll">
            <table className="record-table">
              <thead>
                <tr>
                  <th>{t("Receipt", "Resibo")}</th>
                  <th>{t("Date", "Petsa")}</th>
                  <th>{t("Payment", "Bayad")}</th>
                  <th>{t("Total", "Kabuuan")}</th>
                  <th>{t("Profit", "Tubo")}</th>
                  <th>{t("Status", "Status")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id}>
                    <td className="record-main">
                      <strong>#{s.receipt_no}</strong>
                    </td>
                    <td data-label={t("Date", "Petsa")}>
                      {dateLabel(s.created_at)}
                    </td>
                    <td data-label={t("Payment", "Bayad")}>
                      {s.is_credit ? t("Credit", "Utang") : t("Cash", "Cash")}
                    </td>
                    <td data-label={t("Total", "Halaga")}>
                      <strong>{money(s.total)}</strong>
                    </td>
                    <td data-label={t("Profit", "Tubo")}>
                      {money(s.profit_total)}
                    </td>
                    <td>
                      <Badge
                        tone={s.status === "voided" ? "neutral" : "success"}
                      >
                        {s.status === "voided"
                          ? t("Voided", "Kinansela")
                          : t("Completed", "Kumpleto")}
                      </Badge>
                    </td>
                    <td className="record-actions">
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          aria-label={"View receipt " + s.receipt_no}
                          onClick={() => setReceipt(s)}
                        >
                          <Eye size={17} />
                        </button>
                        {data.role === "owner" && s.status === "completed" && (
                          <button
                            className="icon-button"
                            aria-label={"Void sale " + s.receipt_no}
                            onClick={() => setVoiding(s)}
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Receipt sale={receipt} onClose={() => setReceipt(null)} />
      {voiding && (
        <FormDialog
          open
          onClose={() => setVoiding(null)}
          title={t("Void this sale?", "Kanselahin ang bentang ito?")}
          submit={t("Void sale", "Kanselahin ang benta")}
          onSubmit={(f, requestId) =>
            execute(
              "sale.void",
              {
                sale_id: voiding.id,
                reason: string(f, "reason"),
              },
              requestId,
            )
          }
        >
          <p className="full-width">
            #{voiding.receipt_no} · {money(voiding.total)}
          </p>
          <p className="full-width muted">
            {t(
              "Stock will be restored and collected cash will be reversed. Later credit repayments must be reconciled first.",
              "Ibabalik ang stock at nakolektang cash. Kailangang ayusin muna ang mga sumunod na bayad sa utang.",
            )}
          </p>
          <div className="full-width">
            <Field label={t("Reason for void", "Dahilan ng pagkansela")}>
              <input name="reason" required maxLength={255} />
            </Field>
          </div>
        </FormDialog>
      )}
    </>
  );
}
function SalesChart({ rows }: { rows: (string | number | null)[][] }) {
  const { t } = useStore();
  if (!rows.length)
    return (
      <Empty
        title={t(
          "A new story starts with a sale",
          "Magsisimula sa unang benta",
        )}
      />
    );
  const max = Math.max(
    1,
    ...rows.map((r) => Number(r[1])),
    ...rows.map((r) => Number(r[3])),
  );
  const min = Math.min(0, ...rows.map((r) => Number(r[3])));
  const y = (n: number) => 180 - ((n - min) / (max - min)) * 150;
  const x = (i: number) => 52 + ((i + 0.5) * 620) / rows.length;
  const base = y(0);
  const points = rows.map((r, i) => x(i) + "," + y(Number(r[3]))).join(" ");
  return (
    <div className="sales-chart">
      <svg
        viewBox="0 0 720 220"
        role="img"
        aria-label={t(
          "Sales bars and gross profit line",
          "Mga bar ng benta at linya ng tubo",
        )}
      >
        <title>{t("Sales and gross profit", "Benta at tubo")}</title>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line
              x1="48"
              x2="690"
              y1={y(max * f)}
              y2={y(max * f)}
              stroke="var(--border)"
              strokeDasharray="3 5"
            />
            <text x="42" y={y(max * f) + 4} textAnchor="end">
              {Math.round(max * f).toLocaleString()}
            </text>
          </g>
        ))}
        {rows.map((r, i) => (
          <rect
            key={String(r[0])}
            x={x(i) - Math.min(22, 200 / rows.length)}
            y={y(Number(r[1]))}
            width={Math.min(44, 400 / rows.length)}
            height={Math.max(0, base - y(Number(r[1])))}
            rx="4"
            fill="var(--primary)"
            opacity=".82"
          >
            <title>{String(r[0]) + ": " + money(Number(r[1]))}</title>
          </rect>
        ))}
        <polyline
          points={points}
          fill="none"
          stroke="var(--success)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {rows.map((r, i) => (
          <circle
            key={String(r[0])}
            cx={x(i)}
            cy={y(Number(r[3]))}
            r="4"
            fill="var(--surface)"
            stroke="var(--success)"
            strokeWidth="2"
          >
            <title>{String(r[0]) + ": " + money(Number(r[3]))}</title>
          </circle>
        ))}
        <text x="52" y="211">
          {String(rows[0][0]).slice(5)}
        </text>
        <text x="680" y="211" textAnchor="end">
          {String(rows.at(-1)![0]).slice(5)}
        </text>
      </svg>
    </div>
  );
}
