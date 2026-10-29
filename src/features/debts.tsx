"use client";
import { useState } from "react";
import {
  BookOpen,
  Plus,
  Wallet,
  Users,
  History,
  TriangleAlert,
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
import type { Debt } from "@/lib/types";
export function Debts() {
  const { data, t, execute } = useStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("open");
  const [create, setCreate] = useState(false);
  const [pay, setPay] = useState<Debt | null>(null);
  const [history, setHistory] = useState<Debt | null>(null);
  const active = data.debts.filter((d) => d.status !== "voided");
  const today = businessDate();
  const debts = data.debts.filter(
    (d) =>
      [d.customer_name, d.customer_phone].some((s) =>
        s.toLowerCase().includes(search.toLowerCase()),
      ) &&
      (status === "all" ||
        (status === "open" ? d.balance > 0 : d.status === status)),
  );
  const label = (d: Debt) =>
    d.status === "voided"
      ? t("Voided", "Kinansela")
      : d.status === "paid"
        ? t("Paid", "Bayad na")
        : d.status === "partially_paid"
          ? t("Partly paid", "May paunang bayad")
          : t("Unpaid", "Hindi pa bayad");
  return (
    <>
      <PageHeader
        eyebrow={t("TRUST, WITH A CLEAR RECORD", "TIWALA, MAY MALINAW NA TALA")}
        title={t(
          "Good neighbors. Clear records.",
          "Magandang samahan. Malinaw na tala.",
        )}
        description={t(
          "Keep track of customer credit and every payment along the way.",
          "Subaybayan ang utang at bawat bayad ng mga kostumer.",
        )}
        actions={
          <button
            className="button button-primary"
            onClick={() => setCreate(true)}
          >
            <Plus size={17} />
            {t("Record debt", "Magtala ng utang")}
          </button>
        }
      />
      <div className="metrics-grid three">
        <Metric
          label={t("Outstanding credit", "Kabuuang hindi pa bayad")}
          value={money(active.reduce((s, d) => s + d.balance, 0))}
          icon={Wallet}
          accent
        />
        <Metric
          label={t("Customers with a balance", "Kostumer na may balanse")}
          value={
            new Set(
              active
                .filter((d) => d.balance > 0)
                .map((d) => d.customer_name.toLowerCase()),
            ).size
          }
          icon={Users}
        />
        <Metric
          label={t("Overdue credit", "Lampas sa takdang bayad")}
          value={money(
            active
              .filter((d) => d.balance > 0 && d.due_date && d.due_date < today)
              .reduce((s, d) => s + d.balance, 0),
          )}
          icon={TriangleAlert}
        />
      </div>
      <section className="panel">
        <div className="panel-toolbar">
          <SearchInput
            label={t("Search customers", "Hanapin ang kostumer")}
            value={search}
            onChange={setSearch}
          />
          <select
            aria-label={t("Credit status", "Status ng utang")}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="open">{t("With balance", "May balanse")}</option>
            <option value="all">{t("All records", "Lahat ng tala")}</option>
            <option value="paid">{t("Paid", "Bayad na")}</option>
            <option value="partially_paid">
              {t("Partly paid", "May paunang bayad")}
            </option>
            <option value="voided">{t("Voided", "Kinansela")}</option>
          </select>
        </div>
        {!debts.length ? (
          <Empty
            title={t("A clean slate", "Malinis ang tala")}
            description={t(
              "No customer credit matches this view.",
              "Walang utang na tugma sa hinahanap.",
            )}
          >
            <BookOpen size={20} />
          </Empty>
        ) : (
          <div className="table-scroll">
            <table className="record-table">
              <thead>
                <tr>
                  <th>{t("Customer", "Kostumer")}</th>
                  <th>{t("Original amount", "Orihinal na halaga")}</th>
                  <th>{t("Paid", "Naibayad")}</th>
                  <th>{t("Balance", "Balanse")}</th>
                  <th>{t("Status", "Status")}</th>
                  <th>{t("Actions", "Aksyon")}</th>
                </tr>
              </thead>
              <tbody>
                {debts.toReversed().map((d) => (
                  <tr key={d.id}>
                    <td className="record-main">
                      <span className="customer-avatar">
                        {d.customer_name.slice(0, 1)}
                      </span>
                      <span>
                        <strong>{d.customer_name}</strong>
                        <small>
                          {d.customer_phone || dateLabel(d.created_at)}
                          {d.due_date && (
                            <span
                              className={
                                d.balance > 0 && d.due_date < today
                                  ? "negative"
                                  : ""
                              }
                            >
                              {" "}
                              · {t("Due", "Takda")} {dateLabel(d.due_date)}
                            </span>
                          )}
                        </small>
                      </span>
                    </td>
                    <td data-label={t("Original amount", "Halaga")}>
                      {money(d.total_amount)}
                    </td>
                    <td data-label={t("Paid", "Naibayad")}>
                      {money(d.paid_amount)}
                    </td>
                    <td data-label={t("Balance", "Balanse")}>
                      <strong>{money(d.balance)}</strong>
                    </td>
                    <td>
                      <Badge
                        tone={
                          d.status === "paid"
                            ? "success"
                            : d.status === "voided"
                              ? "neutral"
                              : "warning"
                        }
                      >
                        {label(d)}
                      </Badge>
                    </td>
                    <td className="record-actions">
                      <div className="row-actions">
                        {d.balance > 0 && (
                          <button
                            className="button button-small"
                            onClick={() => setPay(d)}
                          >
                            {t("Record payment", "Magtala ng bayad")}
                          </button>
                        )}
                        <button
                          className="icon-button"
                          aria-label={"Payment history " + d.customer_name}
                          onClick={() => setHistory(d)}
                        >
                          <History size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer className="panel-footer">
          {t(
            "Every payment has a place in the record.",
            "Bawat bayad ay may malinaw na tala.",
          )}
        </footer>
      </section>
      {create && (
        <FormDialog
          open
          onClose={() => setCreate(false)}
          title={t("Record debt", "Magtala ng utang")}
          submit={t("Save debt", "I-save ang utang")}
          onSubmit={(f, requestId) =>
            execute(
              "debt.create",
              {
                customer_name: string(f, "customer_name"),
                customer_phone: string(f, "phone"),
                total_amount: number(f, "total"),
                downpayment: number(f, "downpayment"),
                due_date: string(f, "due_date") || null,
                notes: string(f, "notes"),
              },
              requestId,
            )
          }
        >
          <Field label={t("Customer name", "Pangalan ng kostumer")}>
            <input name="customer_name" required maxLength={120} />
          </Field>
          <Field label={t("Phone (optional)", "Telepono (opsyonal)")}>
            <input name="phone" maxLength={30} />
          </Field>
          <Field label={t("Total amount", "Kabuuang halaga")}>
            <input name="total" type="number" step="0.01" min="0.01" required />
          </Field>
          <Field label={t("Downpayment", "Paunang bayad")}>
            <input
              name="downpayment"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
            />
          </Field>
          <Field
            label={t("Due date (optional)", "Petsa ng singilan (opsyonal)")}
          >
            <input type="date" name="due_date" />
          </Field>
          <Field label={t("Notes (optional)", "Tala (opsyonal)")}>
            <input name="notes" maxLength={255} />
          </Field>
        </FormDialog>
      )}
      {pay && (
        <FormDialog
          open
          onClose={() => setPay(null)}
          title={t("Payment from ", "Bayad ni ") + pay.customer_name}
          submit={t("Save payment", "I-save ang bayad")}
          onSubmit={(f, requestId) =>
            execute(
              "debt.pay",
              {
                debt_id: pay.id,
                amount: number(f, "amount"),
                payment_date: string(f, "date"),
                note: string(f, "note"),
              },
              requestId,
            )
          }
        >
          <div className="full-width payment-balance">
            <span>{t("Outstanding balance", "Natitirang balanse")}</span>
            <strong>{money(pay.balance)}</strong>
          </div>
          <Field label={t("Payment amount", "Halaga ng bayad")}>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={pay.balance}
              required
              autoFocus
            />
          </Field>
          <Field label={t("Payment date", "Petsa ng bayad")}>
            <input name="date" type="date" defaultValue={today} required />
          </Field>
          <div className="full-width">
            <Field label={t("Note (optional)", "Tala (opsyonal)")}>
              <input name="note" maxLength={255} />
            </Field>
          </div>
        </FormDialog>
      )}
      {history && (
        <Dialog
          open
          onClose={() => setHistory(null)}
          title={
            t("Payment history", "Kasaysayan ng bayad") +
            " · " +
            history.customer_name
          }
        >
          <div className="dialog-body">
            <div className="payment-balance">
              <span>{t("Current balance", "Kasalukuyang balanse")}</span>
              <strong>
                {money(
                  data.debts.find((d) => d.id === history.id)?.balance ?? 0,
                )}
              </strong>
            </div>
            {data.debt_payments.filter((p) => p.debt_id === history.id)
              .length ? (
              <ul className="activity-list">
                {data.debt_payments
                  .filter((p) => p.debt_id === history.id)
                  .toReversed()
                  .map((p) => (
                    <li key={p.id}>
                      <span className="activity-icon">
                        <Wallet size={18} />
                      </span>
                      <div>
                        <strong>
                          {p.is_downpayment
                            ? t("Downpayment", "Paunang bayad")
                            : t("Payment", "Bayad")}
                        </strong>
                        <small>
                          {dateLabel(p.payment_date)} · {p.note}
                        </small>
                      </div>
                      <strong className="positive">{money(p.amount)}</strong>
                    </li>
                  ))}
              </ul>
            ) : (
              <Empty title={t("No payments yet", "Wala pang bayad")} />
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
