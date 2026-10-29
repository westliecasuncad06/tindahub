import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { backendConfig } from "@/lib/config";
import { createDemoData } from "@/lib/demo";
import { serverClient } from "@/lib/supabase/server";
import { StoreProvider } from "@/components/provider";
import { AppShell } from "@/components/app-shell";
import { Onboarding } from "@/components/onboarding";
import type { AppData } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function Workspace({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = backendConfig();
  const jar = await cookies();
  const language = jar.get("tindahub_language")?.value === "en" ? "en" : "tl";
  if (!configured)
    return (
      <StoreProvider
        initialData={createDemoData()}
        initialLanguage={language}
        demo
      >
        <AppShell>{children}</AppShell>
      </StoreProvider>
    );
  const client = await serverClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login");
  const store = jar.get("tindahub_store")?.value;
  let result = await client.rpc(
    "app_snapshot",
    store ? { p_store_id: store } : {},
  );
  if (result.error && store) result = await client.rpc("app_snapshot", {});
  if (result.error) {
    if (result.error.message.includes("No store membership"))
      return (
        <Onboarding
          name={String(user.user_metadata.name || "")}
          storeName={String(user.user_metadata.store_name || "")}
        />
      );
    return (
      <main className="onboarding">
        <div className="onboarding-card">
          <h1>We couldn’t load your store.</h1>
          <p>
            Check your Supabase connection and apply the TindaHub database
            migrations. Your records have not been replaced with demo data.
          </p>
          <p className="form-error">{result.error.message}</p>
          <a href="/pos" className="button">
            Try again
          </a>
        </div>
      </main>
    );
  }
  return (
    <StoreProvider
      key={(result.data as unknown as AppData).store_id}
      initialData={result.data as unknown as AppData}
      demo={false}
      initialLanguage={language}
    >
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
