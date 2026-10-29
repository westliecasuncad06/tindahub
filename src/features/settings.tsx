"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Store,
  ShieldCheck,
  Palette,
  RefreshCw,
  Users,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { useStore } from "@/components/provider";
import {
  PageHeader,
  Field,
  FormDialog,
  number,
  string,
  Badge,
} from "@/components/ui";
import { auditStock } from "@/lib/domain";
import { browserClient } from "@/lib/supabase/client";
export function Settings() {
  const router = useRouter();
  const {
    data,
    demo,
    t,
    execute,
    busy,
    language,
    setLanguage,
    theme,
    setTheme,
    resetDemo,
  } = useStore();
  const [reset, setReset] = useState(false);
  const [repair, setRepair] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const saveRequest = useRef<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [staffMessage, setStaffMessage] = useState("");
  const mismatches = auditStock(data);
  async function save(f: FormData) {
    setError("");
    setSaved(false);
    try {
      saveRequest.current ??= crypto.randomUUID();
      await execute(
        "settings.update",
        {
          store_name: string(f, "store_name"),
          owner_name: string(f, "owner_name"),
          address: string(f, "address"),
          phone: string(f, "phone"),
          receipt_footer: string(f, "receipt_footer"),
          profit_target: number(f, "profit_target"),
        },
        saveRequest.current,
      );
      saveRequest.current = null;
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    }
  }
  return (
    <>
      <PageHeader
        eyebrow={t("MAKE YOURSELF AT HOME", "AYUSIN AYON SA IYONG TINDAHAN")}
        title={t("A workspace that’s yours.", "Workspace na para sa iyo.")}
        description={t(
          "The details that make your store, your store.",
          "Mga detalye para sa sariling tindahan.",
        )}
      />
      <div className="settings-layout">
        <div className="settings-main">
          <section className="panel">
            <div className="panel-heading">
              <div className="section-title">
                <span className="activity-icon">
                  <Store size={20} />
                </span>
                <div>
                  <h2>{t("Your store details", "Mga detalye ng tindahan")}</h2>
                  <p>
                    {t(
                      "These details also appear on receipts.",
                      "Makikita rin ang mga detalye sa resibo.",
                    )}
                  </p>
                </div>
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save(new FormData(e.currentTarget));
              }}
            >
              <fieldset
                disabled={data.role !== "owner" || busy}
                className="settings-fields form-grid"
              >
                <Field label={t("Store name", "Pangalan ng tindahan")}>
                  <input
                    name="store_name"
                    defaultValue={data.settings.store_name}
                    required
                    maxLength={160}
                  />
                </Field>
                <Field label={t("Owner name", "Pangalan ng may-ari")}>
                  <input
                    name="owner_name"
                    defaultValue={data.settings.owner_name}
                    maxLength={120}
                  />
                </Field>
                <div className="full-width">
                  <Field label={t("Address", "Tirahan ng tindahan")}>
                    <input
                      name="address"
                      defaultValue={data.settings.address}
                      maxLength={255}
                    />
                  </Field>
                </div>
                <Field label={t("Phone number", "Telepono")}>
                  <input
                    name="phone"
                    defaultValue={data.settings.phone}
                    maxLength={30}
                  />
                </Field>
                <Field
                  label={t(
                    "Daily net profit target",
                    "Target na netong kita bawat araw",
                  )}
                >
                  <input
                    name="profit_target"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={data.settings.profit_target}
                  />
                </Field>
                <div className="full-width">
                  <Field label={t("Receipt footer", "Mensahe sa resibo")}>
                    <textarea
                      name="receipt_footer"
                      rows={2}
                      defaultValue={data.settings.receipt_footer}
                      maxLength={255}
                    />
                  </Field>
                </div>
              </fieldset>
              <footer className="panel-footer">
                <span className={error ? "negative" : "positive"}>
                  {error ||
                    (saved &&
                      t(
                        "Store details saved.",
                        "Na-save ang detalye ng tindahan.",
                      ))}
                </span>
                <button
                  className="button button-primary"
                  disabled={busy || data.role !== "owner"}
                >
                  <Save size={16} />
                  {t("Save store details", "I-save ang detalye")}
                </button>
              </footer>
            </form>
          </section>
          {!demo && (
            <section className="panel">
              <div className="panel-heading">
                <div className="section-title">
                  <span className="activity-icon">
                    <KeyRound size={20} />
                  </span>
                  <div>
                    <h2>{t("Account security", "Seguridad ng account")}</h2>
                    <p>
                      {t(
                        "Choose a password with at least 8 characters.",
                        "Gumamit ng password na may hindi bababa sa 8 karakter.",
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <form
                className="settings-fields"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  setPasswordMessage("");
                  try {
                    const client = browserClient();
                    const {
                      data: { user },
                    } = await client.auth.getUser();
                    if (!user?.email) throw new Error("Please sign in again.");
                    const auth = await client.auth.signInWithPassword({
                      email: user.email,
                      password: string(f, "current"),
                    });
                    if (auth.error) throw auth.error;
                    if (f.get("new") !== f.get("confirm"))
                      throw new Error("Passwords do not match.");
                    const update = await client.auth.updateUser({
                      password: string(f, "new"),
                    });
                    if (update.error) throw update.error;
                    setPasswordMessage(
                      t("Password updated.", "Na-update ang password."),
                    );
                  } catch (e) {
                    setPasswordMessage(
                      e instanceof Error
                        ? e.message
                        : "Unable to update password.",
                    );
                  }
                }}
              >
                <div className="form-grid">
                  <Field label={t("Current password", "Kasalukuyang password")}>
                    <input
                      name="current"
                      type="password"
                      autoComplete="current-password"
                      required
                    />
                  </Field>
                  <Field label={t("New password", "Bagong password")}>
                    <input
                      name="new"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </Field>
                  <Field
                    label={t(
                      "Confirm new password",
                      "Ulitin ang bagong password",
                    )}
                  >
                    <input
                      name="confirm"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </Field>
                </div>
                <p role="status">{passwordMessage}</p>
                <button className="button">
                  {t("Update password", "Palitan ang password")}
                </button>
              </form>
            </section>
          )}
          {!demo && data.role === "owner" && (
            <section className="panel">
              <div className="panel-heading">
                <div className="section-title">
                  <span className="activity-icon">
                    <Users size={20} />
                  </span>
                  <div>
                    <h2>{t("Add a team member", "Magdagdag ng kawani")}</h2>
                    <p>
                      {t(
                        "They must register and verify their email first. Staff can make sales and record payments; owner tools stay protected.",
                        "Kailangang nakarehistro at verified muna ang email. Maaaring magbenta at magtala ng bayad ang kawani.",
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <form
                className="settings-fields"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const { error } = await browserClient().rpc("add_staff", {
                    p_store_id: data.store_id,
                    p_email: string(f, "email"),
                  });
                  setStaffMessage(
                    error
                      ? error.message
                      : t(
                          "Staff access granted.",
                          "Naibigay na ang access ng kawani.",
                        ),
                  );
                }}
              >
                <Field label={t("Staff email", "Email ng kawani")}>
                  <input name="email" type="email" required />
                </Field>
                <p role="status">{staffMessage}</p>
                <button className="button">
                  {t("Add staff", "Idagdag ang kawani")}
                </button>
              </form>
            </section>
          )}
        </div>
        <aside className="settings-aside">
          <section className="panel">
            <div className="panel-heading">
              <div className="section-title">
                <Palette size={20} />
                <h2>{t("Make it comfortable", "Gawing komportable")}</h2>
              </div>
            </div>
            <div className="settings-fields">
              <Field label={t("Language", "Wika")}>
                <select
                  value={language}
                  onChange={(e) =>
                    setLanguage(e.target.value === "en" ? "en" : "tl")
                  }
                >
                  <option value="tl">Filipino</option>
                  <option value="en">English</option>
                </select>
              </Field>
              <Field label={t("Appearance", "Tema")}>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                >
                  <option value="light">{t("Light", "Maliwanag")}</option>
                  <option value="dark">{t("Dark", "Madilim")}</option>
                </select>
              </Field>
              {data.stores && data.stores.length > 1 && (
                <Field label={t("Active store", "Aktibong tindahan")}>
                  <select
                    value={data.store_id}
                    onChange={(e) => {
                      document.cookie =
                        "tindahub_store=" +
                        encodeURIComponent(e.target.value) +
                        "; path=/; SameSite=Lax; max-age=31536000" +
                        (location.protocol === "https:" ? "; Secure" : "");
                      router.replace("/pos");
                      router.refresh();
                    }}
                  >
                    {data.stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div className="section-title">
                <ShieldCheck size={20} />
                <h2>{t("Stock ledger check", "Suriin ang stock ledger")}</h2>
              </div>
            </div>
            <div className="settings-fields">
              <div
                className={
                  "ledger-status " + (mismatches.length ? "warning" : "")
                }
              >
                <CheckCircle2 size={23} />
                <strong>
                  {mismatches.length
                    ? mismatches.length +
                      " " +
                      t("mismatches found", "diperensyang nakita")
                    : t(
                        "All stock balances match.",
                        "Tugma ang lahat ng stock.",
                      )}
                </strong>
              </div>
              <p className="muted">
                {t(
                  "Compares product quantities with the sum of their stock movements.",
                  "Inihahambing ang dami ng paninda sa kabuuan ng stock movements.",
                )}
              </p>
              {mismatches.map((m) => (
                <p key={m.product_id} className="small-text">
                  {m.product_name}: {m.stock_qty} / {m.ledger_qty}
                </p>
              ))}
              {mismatches.length > 0 && data.role === "owner" && (
                <button className="button" onClick={() => setRepair(true)}>
                  {t("Review and repair", "Suriin at ayusin")}
                </button>
              )}
            </div>
          </section>
          <section className="panel demo-settings">
            <div className="panel-heading">
              <h2>
                {demo
                  ? t("About your demo", "Tungkol sa demo")
                  : t("Your connection", "Iyong koneksyon")}
              </h2>
              <Badge tone={demo ? "warning" : "success"}>
                {demo ? "Demo" : "Supabase"}
              </Badge>
            </div>
            <div className="settings-fields">
              <p>
                {demo
                  ? t(
                      "Sample records stay on this browser. Connect your own Supabase project to start a real store.",
                      "Sa browser na ito lang ang sample data. Ikonekta ang sariling Supabase project para sa totoong tindahan.",
                    )
                  : t(
                      "Your business data is stored in your Supabase Postgres database with protected store access.",
                      "Naka-save ang datos sa Supabase Postgres at protektado ang access ng bawat tindahan.",
                    )}
              </p>
              {demo && (
                <button className="button" onClick={() => setReset(true)}>
                  <RefreshCw size={15} />
                  {t("Reset demo data", "I-reset ang sample data")}
                </button>
              )}
            </div>
          </section>
        </aside>
      </div>
      {reset && (
        <FormDialog
          open
          onClose={() => setReset(false)}
          title={t("Reset this demo?", "I-reset ang demo?")}
          submit={t("Reset demo", "I-reset ang demo")}
          onSubmit={async () => resetDemo()}
        >
          <p className="full-width">
            {t(
              "This replaces browser-local sample changes with the starting examples. Real Supabase records are not affected.",
              "Papalitan nito ang sample changes sa browser ng mga panimulang halimbawa. Hindi nito gagalawin ang Supabase records.",
            )}
          </p>
        </FormDialog>
      )}
      {repair && (
        <FormDialog
          open
          onClose={() => setRepair(false)}
          title={t("Repair stock ledger", "Ayusin ang stock ledger")}
          submit={t("Append repair entries", "Idagdag ang mga pagwawasto")}
          onSubmit={(f, requestId) =>
            execute("stock.repair", { reason: string(f, "reason") }, requestId)
          }
        >
          <p className="full-width">
            {t(
              "This adds adjustment entries so the ledger matches current product stock. Check a physical count first if the product quantities may be wrong.",
              "Magdadagdag ito ng adjustment entries upang tumugma ang ledger sa kasalukuyang stock. Magbilang muna kung hindi tiyak ang dami.",
            )}
          </p>
          <div className="full-width">
            <Field label={t("Reason for repair", "Dahilan ng pagwawasto")}>
              <input name="reason" required maxLength={255} />
            </Field>
          </div>
        </FormDialog>
      )}
    </>
  );
}
