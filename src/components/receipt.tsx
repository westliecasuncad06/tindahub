"use client";
import { Printer, Check } from "lucide-react";
import { useStore } from "./provider";
import { Dialog, dateLabel } from "./ui";
import { money } from "@/lib/domain";
import type { Sale } from "@/lib/types";
export function Receipt({
  sale,
  onClose,
  success = false,
}: {
  sale: Sale | null;
  onClose: () => void;
  success?: boolean;
}) {
  const { data, t } = useStore();
  if (!sale) return null;
  const items = data.sale_items.filter((i) => i.sale_id === sale.id);
  return (
    <Dialog
      open
      title={
        success
          ? t("Sale complete", "Matagumpay na benta")
          : t("Sale receipt", "Resibo ng benta")
      }
      onClose={onClose}
    >
      <div className="dialog-body receipt-wrap">
        {success && (
          <div className="receipt-success">
            <Check size={24} />
            <strong>
              {t("Another little win.", "Isa na namang magandang benta.")}
            </strong>
          </div>
        )}
        <div className="receipt print-content">
          <h3>{data.settings.store_name}</h3>
          {data.settings.address && <p>{data.settings.address}</p>}
          <p>
            {sale.receipt_no} · {dateLabel(sale.created_at)}
          </p>
          <p>
            {sale.status === "voided"
              ? t("VOIDED", "KINANSELA")
              : sale.is_credit
                ? t("CUSTOMER CREDIT", "PAUTANG")
                : t("CASH SALE", "BAYAD NG CASH")}
          </p>
          <div className="receipt-lines">
            {items.map((i) => (
              <div key={i.id}>
                <span>
                  {i.product_name}
                  <small>
                    {i.qty} × {money(i.unit_price)}
                  </small>
                </span>
                <strong>{money(i.line_total)}</strong>
              </div>
            ))}
          </div>
          <div className="receipt-row">
            <span>{t("Subtotal", "Subtotal")}</span>
            <span>{money(sale.subtotal)}</span>
          </div>
          <div className="receipt-row">
            <span>{t("Discount", "Tawad")}</span>
            <span>−{money(sale.discount)}</span>
          </div>
          <div className="receipt-row receipt-total">
            <strong>{t("Total", "Kabuuan")}</strong>
            <strong>{money(sale.total)}</strong>
          </div>
          <div className="receipt-row">
            <span>{t("Cash received", "Natanggap na cash")}</span>
            <span>{money(sale.cash_received)}</span>
          </div>
          <div className="receipt-row">
            <span>
              {sale.is_credit
                ? t("Credit balance", "Balanse sa utang")
                : t("Change", "Sukli")}
            </span>
            <strong>
              {money(
                sale.is_credit
                  ? sale.total - sale.cash_received
                  : sale.change_given,
              )}
            </strong>
          </div>
          {sale.customer_name && <p>{sale.customer_name}</p>}
          <p className="receipt-footer">{data.settings.receipt_footer}</p>
        </div>
      </div>
      <footer className="dialog-footer">
        <button className="button" onClick={() => window.print()}>
          <Printer size={17} />
          {t("Print receipt", "I-print ang resibo")}
        </button>
        <button className="button button-primary" onClick={onClose}>
          {success ? t("New sale", "Bagong benta") : t("Close", "Isara")}
        </button>
      </footer>
    </Dialog>
  );
}
