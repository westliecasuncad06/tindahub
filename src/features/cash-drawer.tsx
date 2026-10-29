"use client";
import { useState } from "react";
import {
  Plus,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardCheck,
} from "lucide-react";
import { useStore } from "@/components/provider";
import {
  PageHeader,
  Metric,
  Empty,
  Field,
  FormDialog,
  Badge,
  number,
  string,
} from "@/components/ui";
import { businessDate, drawerBalance, money } from "@/lib/domain";
export function CashDrawer() {
  const { data, t, execute } = useStore();
  const [date, setDate] = useState(businessDate());
  const [create, setCreate] = useState(false);
  const entries = data.drawer.filter((e) => e.business_date === date);
  const balance = drawerBalance(data, date);
  const lastCount = entries.filter((e) => e.type === "count").at(-1);
  const label = (type: string) =>
    ({
      opening: t("Opening float", "Panimulang barya"),
      sale: t("Sale payment", "Bayad sa benta"),
      payout: t("Cash out", "Bawas cash"),
      deposit: t("Cash in", "Dagdag cash"),
      count: t("Physical count", "Bilang ng cash"),
      reversal: t("Reversal", "Pagbabalik"),
    })[type] ?? type;
  return (
    <>
      <PageHeader
        eyebrow={t(
          "A BALANCED END TO THE DAY",
          "MAAYOS NA KAHERA SA DULO NG ARAW",
        )}
        title={t("Keep the drawer in check.", "Bantayan ang laman ng kahera.")}
        description={t(
          "Opening cash, sales, payments, and payouts in one place.",
          "Panimulang cash, benta, bayad, at bawas sa iisang talaan.",
        )}
        actions={
          <button
            className="button button-primary"
            onClick={() => setCreate(true)}
          >
            <Plus size={17} />
            {t("Record cash movement", "Magtala ng galaw ng cash")}
          </button>
        }
      />
      <div className="metrics-grid three">
        <Metric
          label={t("Expected cash", "Inaasahang cash")}
          value={money(balance)}
          icon={Wallet}
          accent
        />
        <Metric
          label={t("Last counted cash", "Huling bilang ng cash")}
          value={lastCount ? money(lastCount.actual_amount ?? 0) : "—"}
          icon={ClipboardCheck}
        />
        <Metric
          label={t("Last count variance", "Diperensya sa huling bilang")}
          value={lastCount ? money(lastCount.variance ?? 0) : "—"}
          detail={t(
            "Counts don’t change expected cash",
            "Hindi binabago ng bilang ang inaasahang cash",
          )}
        />
      </div>
      <section className="panel">
        <div className="panel-toolbar">
          <h2>{t("Cash activity", "Galaw ng cash")}</h2>
          <input
            aria-label={t("Drawer date", "Petsa ng kahera")}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        {!entries.length ? (
          <Empty
            title={t(
              "No cash records for this day",
              "Walang tala ng cash sa araw na ito",
            )}
          />
        ) : (
          <ul className="activity-list cash-activity">
            {entries.toReversed().map((e) => (
              <li key={e.id}>
                <span
                  className={"activity-icon " + (e.amount < 0 ? "out" : "")}
                >
                  {e.type === "count" ? (
                    <ClipboardCheck size={19} />
                  ) : e.amount < 0 ? (
                    <ArrowUpRight size={19} />
                  ) : (
                    <ArrowDownLeft size={19} />
                  )}
                </span>
                <div>
                  <strong>{label(e.type)}</strong>
                  <small>{e.note}</small>
                </div>
                <div className="cash-entry-value">
                  <strong className={e.amount < 0 ? "negative" : "positive"}>
                    {e.type === "count"
                      ? money(e.actual_amount ?? 0)
                      : (e.amount > 0 ? "+" : "") + money(e.amount)}
                  </strong>
                  {e.type === "count" && (
                    <Badge tone={e.variance ? "warning" : "success"}>
                      {t("Variance", "Diperensya")} {money(e.variance ?? 0)}
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {create && (
        <FormDialog
          open
          onClose={() => setCreate(false)}
          title={t("Record cash movement", "Magtala ng galaw ng cash")}
          submit={t("Save cash record", "I-save ang tala ng cash")}
          onSubmit={(f, requestId) =>
            execute(
              "drawer.record",
              {
                type: string(f, "type"),
                amount: number(f, "amount"),
                note: string(f, "note"),
              },
              requestId,
            )
          }
        >
          <div className="full-width">
            <p className="muted">
              {t(
                "This entry will be recorded for today.",
                "Ang tala ay para sa araw na ito.",
              )}{" "}
              {businessDate()}
            </p>
          </div>
          <Field label={t("Movement type", "Uri ng galaw")}>
            <select name="type" defaultValue="deposit">
              <option value="opening">
                {t("Opening float", "Panimulang barya")}
              </option>
              <option value="deposit">
                {t("Cash in / deposit", "Dagdag cash")}
              </option>
              <option value="payout">
                {t("Cash out / payout", "Bawas cash")}
              </option>
              <option value="count">
                {t("End-of-day actual count", "Aktuwal na bilang ng cash")}
              </option>
            </select>
          </Field>
          <Field label={t("Amount", "Halaga")}>
            <input name="amount" type="number" min="0" step="0.01" required />
          </Field>
          <div className="full-width">
            <Field label={t("Note", "Tala")}>
              <input name="note" maxLength={255} />
            </Field>
          </div>
        </FormDialog>
      )}
    </>
  );
}
