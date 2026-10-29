"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/client";
import { Store } from "lucide-react";
export function Onboarding({
  name,
  storeName,
}: {
  name: string;
  storeName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="onboarding">
      <div className="onboarding-card">
        <span className="auth-icon">
          <Store size={32} />
        </span>
        <p className="eyebrow">WELCOME TO TINDAHUB</p>
        <h1>Let’s open your store.</h1>
        <p>
          Your products, sales, and customer records will stay in your own store
          workspace.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            setError("");
            const { error } = await browserClient().rpc("create_store", {
              store_name: String(f.get("store_name")),
              owner_name: String(f.get("owner_name")),
            });
            if (error) {
              setError(error.message);
              setBusy(false);
            } else {
              router.refresh();
            }
          }}
        >
          <label className="field">
            <span>Your name</span>
            <input
              name="owner_name"
              defaultValue={name}
              required
              maxLength={120}
            />
          </label>
          <label className="field">
            <span>Store name</span>
            <input
              name="store_name"
              defaultValue={storeName}
              required
              maxLength={160}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button button-primary" disabled={busy}>
            {busy ? "Opening…" : "Create my store"}
          </button>
        </form>
        <p className="small-text">
          Joining a team? Ask the store owner to add your verified email in
          Settings, then refresh this page.
        </p>
        <button
          className="text-button"
          onClick={() => window.location.reload()}
        >
          Refresh membership
        </button>
        <button
          className="text-button"
          onClick={async () => {
            await browserClient().auth.signOut();
            router.replace("/login");
            router.refresh();
          }}
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
