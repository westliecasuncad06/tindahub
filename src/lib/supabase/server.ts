import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { backendConfig } from "../config";
import type { Database } from "./database.types";
export async function serverClient() {
  const config = backendConfig();
  if (!config) throw new Error("Supabase is not configured.");
  const jar = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        // Server Components cannot write cookies; proxy refreshes them before rendering.
        try {
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          );
        } catch {}
      },
    },
  });
}
