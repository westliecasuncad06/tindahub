"use client";
import { useState } from "react";
import { Plus, Trash2, Wallet, ReceiptText } from "lucide-react";
import { useStore } from "@/components/provider";
import {
  PageHeader,
  Metric,
  SearchInput,
  Empty,
  Field,
  FormDialog,
  Badge,
  number,
  string,
  dateLabel,
} from "@/components/ui";
import { businessDate, money } from "@/lib/domain";
import type { Expense } from "@/lib/types";
export function Expenses() {
  const { data, t, execute } = useStore();
  const today = businessDate();
  const [from, setFrom] = useState(today.slice(0, 7) + "-01");
  const [to, setTo] = useState(today);
  const [search, setSearch] = useState("");
  const [create, setCreate] = useState(false);
  const [remove, setRemove] = useState<Expense | null>(null);
  const expenses = data.expenses.filter(
    (e) =>
      e.expense_date >= from &&
      e.expense_date <= to &&
      [e.category, e.description].some((s) =>
        s.toLowerCase().includes(search.toLowerCase()),
      ),
  );
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  return (
    <>
      <PageHeader
        eyebrow={t("THE OTHER SIDE OF THE LEDGER", "KABILANG BAHAGI NG TALAAN")}
        title={t(
          "Every peso, accounted for.",
          "Bawat piso, may malinaw na tala.",
        )}
        description={t(
          "A clear view of what it takes to keep your store going.",
          "Malinaw na tingin sa mga gastusin ng tindahan.",
        )}
        actions={
          <button
            className="button button-primary"
            onClick={() => setCreate(true)}
          >
            <Plus size={17} />
            {t("Add expense", "Magtala ng gastos")}
          </button>
        }
      />
      <div className="metrics-grid three">
        <Metric
          label={t("Expenses in this period", "Gastos sa panahong ito")}
          value={money(total)}
          icon={Wallet}
          accent
        />
        <Metric
          label={t("Recorded expenses", "Naitalang gastos")}
          value={expenses.length}
          icon={ReceiptText}
        />
        <Metric
          label={t("Paid from drawer", "Binayaran mula sa kahera")}
          value={money(
            expenses
              .filter((e) => e.from_drawer)
              .reduce((s, e) => s + e.amount, 0),
          )}
          detail={t(
            "Cash payouts are recorded automatically",
            "Awtomatikong nakatala ang bawas sa cash",
          )}
        />
      </div>
      <section className="panel">
        <div className="panel-toolbar">
          <SearchInput
            label={t("Search expenses", "Hanapin ang gastos")}
            value={search}
            onChange={setSearch}
          />
          <div className="date-range">
            <input
              aria-label={t("Expenses from", "Gastos mula")}
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
            <span>—</span>
            <input
              aria-label={t("Expenses to", "Gastos hanggang")}
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
        {!expenses.length ? (
          <Empty
            title={t("No expenses in this view", "Walang gastos sa listahan")}
            description={t(
              "Add an expense or choose a different date range.",
              "Magtala ng gastos o baguhin ang petsa.",
            )}
          />
        ) : (
          <div className="table-scroll">
            <table className="record-table">
              <thead>
                <tr>
                  <th>{t("Description", "Detalye")}</th>
                  <th>{t("Date", "Petsa")}</th>
                  <th>{t("Category", "Kategorya")}</th>
                  <th>{t("Amount", "Halaga")}</th>
                  <th>{t("Source", "Pinagmulan")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {expenses.toReversed().map((e) => (
                  <tr key={e.id}>
                    <td className="record-main">
                      <span className="table-product-icon">
                        <ReceiptText size={19} />
                      </span>
                      <strong>{e.description || e.category}</strong>
                    </td>
                    <td data-label={t("Date", "Petsa")}>
                      {dateLabel(e.expense_date)}
                    </td>
                    <td data-label={t("Category", "Kategorya")}>
                      {e.category}
                    </td>
                    <td data-label={t("Amount", "Halaga")}>
                      <strong>{money(e.amount)}</strong>
                    </td>
                    <td>
                      <Badge>
                        {e.from_drawer
                          ? t("Cash drawer", "Kahera")
                          : t("Other funds", "Ibang pondo")}
                      </Badge>
                    </td>
                    <td className="record-actions">
                      {data.role === "owner" && (
                        <button
                          className="icon-button"
                          aria-label={"Delete expense " + e.description}
                          onClick={() => setRemove(e)}
                        >
                          <Trash2 size={16} />
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
          {t("Total for selected records", "Kabuuan ng napiling tala")}:{" "}
          <strong>{money(total)}</strong>
        </footer>
      </section>
      {create && (
        <FormDialog
          open
          onClose={() => setCreate(false)}
          title={t("Add expense", "Magtala ng gastos")}
          submit={t("Save expense", "I-save ang gastos")}
          onSubmit={(f, requestId) =>
            execute(
              "expense.save",
              {
                category: string(f, "category"),
                description: string(f, "description"),
                amount: number(f, "amount"),
                expense_date: string(f, "date"),
                from_drawer: f.get("drawer") === "on",
              },
              requestId,
            )
          }
        >
          <Field label={t("Category", "Kategorya")}>
            <select name="category">
              {[
                "Transport",
                "Utilities",
                "Rent",
                "Supplies",
                "Maintenance",
                "Other",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label={t("Expense amount", "Halaga ng gastos")}>
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
            />
          </Field>
          <div className="full-width">
            <Field label={t("Description", "Detalye")}>
              <input name="description" maxLength={255} />
            </Field>
          </div>
          <Field label={t("Expense date", "Petsa ng gastos")}>
            <input name="date" type="date" defaultValue={today} required />
          </Field>
          <label className="checkbox-field">
            <input type="checkbox" name="drawer" defaultChecked />
            {t("Paid from the cash drawer", "Binayaran mula sa kahera")}
          </label>
        </FormDialog>
      )}
      {remove && (
        <FormDialog
          open
          onClose={() => setRemove(null)}
          title={t("Delete this expense?", "Alisin ang gastos na ito?")}
          submit={t("Delete expense", "Alisin ang gastos")}
          onSubmit={(_f, requestId) =>
            execute("expense.delete", { expense_id: remove.id }, requestId)
          }
        >
          <p className="full-width">
            {remove.description || remove.category} · {money(remove.amount)}
          </p>
          <p className="full-width muted">
            {t(
              "If paid from the drawer, its payout will be reversed in today’s cash records.",
              "Kung binayaran sa kahera, ibabalik ang halaga sa tala ng cash ngayong araw.",
            )}
          </p>
        </FormDialog>
      )}
    </>
  );
}
