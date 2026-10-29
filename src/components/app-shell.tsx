"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ShoppingBag,
  Package,
  ChartNoAxesCombined,
  BookOpen,
  ReceiptText,
  Wallet,
  Settings,
  Menu,
  X,
  ArrowUpRight,
  LogOut,
  Sun,
  Moon,
  CheckCircle2,
  TriangleAlert,
  RefreshCw,
} from "lucide-react";
import { useStore } from "./provider";
import { businessDate } from "@/lib/domain";

const navigation = [
  { href: "/pos", en: "Point of sale", tl: "Bentahan", icon: ShoppingBag },
  {
    href: "/dashboard",
    en: "Overview",
    tl: "Buod ng kita",
    icon: ChartNoAxesCombined,
  },
  { href: "/inventory", en: "Inventory", tl: "Mga paninda", icon: Package },
  {
    href: "/debts",
    en: "Customer credit",
    tl: "Talaan ng utang",
    icon: BookOpen,
  },
  { href: "/expenses", en: "Expenses", tl: "Mga gastos", icon: Wallet },
  { href: "/reports", en: "Reports", tl: "Mga ulat", icon: ReceiptText },
  { href: "/cash-drawer", en: "Cash drawer", tl: "Kahera", icon: Wallet },
  { href: "/settings", en: "Settings", tl: "Mga setting", icon: Settings },
];
export function AppShell({ children }: { children: ReactNode }) {
  const {
    data,
    demo,
    t,
    language,
    setLanguage,
    theme,
    setTheme,
    notice,
    dismiss,
    logout,
    reload,
  } = useStore();
  const pathname = usePathname();
  const person =
    data.user_name ||
    (data.role === "owner"
      ? data.settings.owner_name
      : t("Team member", "Kawani"));
  const [mobile, setMobile] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const active = navigation.find(
    (item) =>
      pathname === item.href ||
      (item.href === "/inventory" && pathname.startsWith("/inventory/")),
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">
        {t("Skip to workspace", "Lumaktaw sa workspace")}
      </a>
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label={t("Close navigation", "Isara ang menu")}
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={"sidebar " + (mobile ? "is-open" : "")}>
        <Link href="/pos" className="brand" onClick={() => setMobile(false)}>
          <Image src="/brand/logo.svg" alt="" width={42} height={42} priority />
          <span>
            Tinda<span className="brand-highlight">Hub</span>
            <small>SARI-SARI STORE WORKSPACE</small>
          </span>
        </Link>
        <button
          className="icon-button sidebar-close"
          aria-label={t("Close navigation", "Isara ang menu")}
          onClick={() => setMobile(false)}
        >
          <X size={20} />
        </button>
        <div className="store-switch">
          <span className="store-avatar">
            {data.settings.store_name.slice(0, 1)}
          </span>
          <div>
            <strong>{data.settings.store_name}</strong>
            <small>
              <span className="status-dot" />
              {t(
                "Your everyday store companion",
                "Kasama sa araw-araw na negosyo",
              )}
            </small>
          </div>
        </div>
        <p className="nav-caption">
          {t("YOUR WORKSPACE", "ANG IYONG TINDAHAN")}
        </p>
        <nav aria-label={t("Main navigation", "Pangunahing menu")}>
          {navigation.map(({ href, en, tl, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={"nav-item " + (active?.href === href ? "active" : "")}
              aria-current={active?.href === href ? "page" : undefined}
              onClick={() => setMobile(false)}
            >
              <Icon size={19} />
              <span>{t(en, tl)}</span>
              {href === "/pos" && <span className="nav-key">POS</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="daily-note">
            <span>✦</span>
            <strong>
              {t(
                "Small store. Big possibilities.",
                "Maliit na tindahan. Malaking pangarap.",
              )}
            </strong>
            <p>
              {t(
                "A little more organized, every day.",
                "Mas maayos na negosyo, araw-araw.",
              )}
            </p>
          </div>
          <button className="profile-row" onClick={() => void logout()}>
            <span className="profile-avatar">{person.slice(0, 1) || "T"}</span>
            <span>
              <strong>{person || t("Store team", "Team ng tindahan")}</strong>
              <small>
                {data.role === "owner"
                  ? t("Store owner", "May-ari")
                  : t("Staff", "Kawani")}
              </small>
            </span>
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label={t("Open navigation", "Buksan ang menu")}
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb-home">
              {t("Workspace", "Tindahan")}
            </span>
            <span className="breadcrumb-separator">/</span>
            <strong>{active ? t(active.en, active.tl) : "TindaHub"}</strong>
          </div>
          <div className="topbar-actions">
            <span className={"connection " + (demo ? "demo" : "")}>
              <span className="status-dot" />
              {demo ? "Demo workspace" : t("Connected", "Nakakonekta")}
            </span>
            <button
              className="language-button"
              onClick={() => setLanguage(language === "en" ? "tl" : "en")}
            >
              {language === "tl" ? "English" : "Filipino"}
            </button>
            <button
              className="icon-button"
              aria-label={t("Toggle dark mode", "Palitan ang tema")}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {!demo && (
              <button
                className="icon-button"
                disabled={refreshing}
                aria-label={t("Refresh store data", "I-refresh ang datos")}
                onClick={async () => {
                  setRefreshing(true);
                  try {
                    await reload();
                  } finally {
                    setRefreshing(false);
                  }
                }}
              >
                <RefreshCw size={18} className={refreshing ? "spin" : ""} />
              </button>
            )}
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            <span>
              {t(
                "You’re exploring sample data. Changes stay in this browser.",
                "Sample data ang ginagamit. Sa browser na ito lang naka-save ang pagbabago.",
              )}
            </span>
            <Link href="/settings">
              {t("About this demo", "Tungkol sa demo")}
              <ArrowUpRight size={13} />
            </Link>
          </div>
        )}
        <main
          id="workspace"
          className={
            "workspace " + (pathname === "/pos" ? "workspace-pos" : "")
          }
        >
          {children}
        </main>
        <footer className="app-footer">
          <span>© {new Date().getFullYear()} TindaHub</span>
          <span>
            {t(
              "Made for the heart of the neighborhood.",
              "Para sa puso ng bawat komunidad.",
            )}
          </span>
          <time dateTime={businessDate()}>{businessDate()}</time>
        </footer>
      </div>
      {notice && (
        <div
          className={"toast " + (notice.error ? "toast-error" : "")}
          role={notice.error ? "alert" : "status"}
        >
          {notice.error ? (
            <TriangleAlert size={19} />
          ) : (
            <CheckCircle2 size={19} />
          )}
          <span>{notice.text}</span>
          <button
            className="icon-button"
            aria-label={t("Dismiss notification", "Isara ang abiso")}
            onClick={dismiss}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
