"use client";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type ComponentType,
} from "react";
import { X, Search, PackageOpen, ArrowUpRight } from "lucide-react";
import { useStore } from "./provider";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      <div className="heading-actions">{actions}</div>
    </div>
  );
}
export function Metric({
  label,
  value,
  detail,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: ComponentType<{ size?: number }>;
  accent?: boolean;
}) {
  return (
    <div className={"metric " + (accent ? "metric-accent" : "")}>
      <div className="metric-top">
        <span>{label}</span>
        {Icon && <Icon size={18} />}
      </div>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <PackageOpen size={28} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}
export function SearchInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-field">
      <Search size={18} />
      <input
        aria-label={label}
        placeholder={placeholder ?? label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="field-control">{children}</span>
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"badge badge-" + tone}>{children}</span>;
}
export function Dialog({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const { t } = useStore();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={heading}
      className={"dialog " + (wide ? "dialog-wide" : "")}
      onCancel={onClose}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <header className="dialog-heading">
        <h2 id={heading}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label={t("Close dialog", "Isara")}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function FormDialog({
  open,
  onClose,
  title,
  submit,
  onSubmit,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  submit: string;
  onSubmit: (data: FormData, requestId: string) => Promise<unknown>;
  children: ReactNode;
}) {
  const [error, setError] = useState("");
  const request = useRef<string | null>(null);
  const { busy, t } = useStore();
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          const form = new FormData(e.currentTarget);
          try {
            request.current ??= crypto.randomUUID();
            await onSubmit(form, request.current);
            onClose();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Unable to save.");
          }
        }}
      >
        <div className="dialog-body form-grid">
          {children}
          {error && (
            <p className="form-error full-width" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="dialog-footer">
          <button
            type="button"
            className="button button-ghost"
            onClick={onClose}
          >
            {t("Cancel", "Kanselahin")}
          </button>
          <button className="button button-primary" disabled={busy}>
            {busy ? t("Saving…", "Sine-save…") : submit}
            <ArrowUpRight size={16} />
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
export const number = (form: FormData, key: string) =>
  Number(form.get(key) || 0);
export const string = (form: FormData, key: string) =>
  String(form.get(key) || "");
export function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(value.length === 10 ? value + "T00:00:00Z" : value));
}
