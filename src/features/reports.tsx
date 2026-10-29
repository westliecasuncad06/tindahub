"use client";
import { useMemo, useState } from "react";
import {
  Download,
  Printer,
  FileSpreadsheet,
  ArrowDownToLine,
} from "lucide-react";
import { useStore } from "@/components/provider";
import { PageHeader, Empty, Badge } from "@/components/ui";
import { businessDate, toCSV } from "@/lib/domain";
import { reportTable, type ReportKind } from "@/lib/reporting";
const kinds: {
  id: ReportKind;
  en: string;
  tl: string;
  description: string;
  detail: string;
}[] = [
  {
    id: "inventory",
    en: "Current inventory",
    tl: "Kasalukuyang imbentaryo",
    description: "Stock, costs, prices, and margins.",
    detail: "Stock, puhunan, presyo, at tubo.",
  },
  {
    id: "movements",
    en: "Stock movements",
    tl: "Galaw ng stock",
    description: "Every product movement, in order.",
    detail: "Bawat pagbabago sa dami ng paninda.",
  },
  {
    id: "low-stock",
    en: "Restock list",
    tl: "Listahan ng dadagdagan",
    description: "Low stock and suggested orders.",
    detail: "Paubos na stock at mungkahing order.",
  },
  {
    id: "sales",
    en: "Sales ledger",
    tl: "Talaan ng benta",
    description: "Receipts, payments, and recorded profit.",
    detail: "Resibo, bayad, at naitalang tubo.",
  },
  {
    id: "profit",
    en: "Profit summary",
    tl: "Buod ng kita",
    description: "Daily sales, expenses, and net profit.",
    detail: "Arawang benta, gastos, at netong kita.",
  },
  {
    id: "counts",
    en: "Physical counts",
    tl: "Mga bilang ng paninda",
    description: "Count adjustments and observations.",
    detail: "Mga pagbabago at aktuwal na bilang.",
  },
  {
    id: "expenses",
    en: "Expense ledger",
    tl: "Talaan ng gastos",
    description: "Your operating costs at a glance.",
    detail: "Malinaw na talaan ng gastos sa negosyo.",
  },
];
export function Reports() {
  const { data, t } = useStore();
  const today = businessDate();
  const [kind, setKind] = useState<ReportKind>("inventory");
  const [from, setFrom] = useState(today.slice(0, 7) + "-01");
  const [to, setTo] = useState(today);
  const selected = kinds.find((k) => k.id === kind)!;
  const table = useMemo(
    () => reportTable(data, kind, from, to),
    [data, kind, from, to],
  );
  function download() {
    const blob = new Blob([toCSV(table.headers, table.rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tindahub-" + kind + "-" + today + ".csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <PageHeader
        eyebrow={t("KNOW YOUR NUMBERS", "KILALANIN ANG MGA NUMERO")}
        title={t("Clarity, on the record.", "Malinaw na datos, nasa talaan.")}
        description={t(
          "Useful reports for your next business decision.",
          "Mga ulat na makatutulong sa susunod na desisyon.",
        )}
      />
      <div className="reports-layout">
        <aside className="report-menu">
          {kinds.map((k) => (
            <button
              key={k.id}
              className={kind === k.id ? "selected" : ""}
              onClick={() => setKind(k.id)}
            >
              <FileSpreadsheet size={19} />
              <span>
                <strong>{t(k.en, k.tl)}</strong>
                <small>{t(k.description, k.detail)}</small>
              </span>
            </button>
          ))}
        </aside>
        <section className="panel report-preview">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                {t("REPORT PREVIEW", "SILIP SA ULAT")}
              </span>
              <h2>{t(selected.en, selected.tl)}</h2>
              <p>{t(selected.description, selected.detail)}</p>
            </div>
            <Badge>
              {table.rows.length} {t("records", "tala")}
            </Badge>
          </div>
          <div className="panel-toolbar">
            <div className="date-range">
              <input
                aria-label={t("Report from", "Ulat mula")}
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                disabled={kind === "inventory" || kind === "low-stock"}
              />
              <span>—</span>
              <input
                aria-label={t("Report to", "Ulat hanggang")}
                type="date"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
                disabled={kind === "inventory" || kind === "low-stock"}
              />
            </div>
            <div className="heading-actions">
              <button className="button" onClick={() => window.print()}>
                <Printer size={16} />
                {t("Print / PDF", "I-print / PDF")}
              </button>
              <button className="button button-primary" onClick={download}>
                <Download size={16} />
                {t("Download CSV", "I-download ang CSV")}
              </button>
            </div>
          </div>
          <div className="print-content report-print">
            <div className="print-heading">
              <h2>{data.settings.store_name}</h2>
              <h3>{t(selected.en, selected.tl)}</h3>
              <p>
                {kind === "inventory" || kind === "low-stock"
                  ? today
                  : from + " — " + to}
              </p>
            </div>
            {table.rows.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {table.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>
                            {typeof cell === "number"
                              ? cell.toLocaleString("en-PH", {
                                  maximumFractionDigits: 3,
                                })
                              : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title={t(
                  "No records for this report",
                  "Walang tala para sa ulat na ito",
                )}
                description={t(
                  "Try another date range.",
                  "Subukang baguhin ang petsa.",
                )}
              />
            )}
          </div>
          <footer className="panel-footer">
            <span>
              <ArrowDownToLine size={14} />
              {t(
                "CSV exports include all matching records. Preview shows up to 200.",
                "Kasama sa CSV ang lahat ng tugmang tala. Hanggang 200 ang nasa preview.",
              )}
            </span>
          </footer>
        </section>
      </div>
    </>
  );
}
