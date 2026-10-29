export type BackendConfig = { url: string; key: string };
export function resolveBackendConfig(
  url: string | undefined,
  key: string | undefined,
): BackendConfig | null {
  if (!url && !key) return null;
  url = url?.trim();
  key = key?.trim();
  if (!url || !key)
    throw new Error(
      "Set both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Supabase URL is invalid.");
  }
  if (!["http:", "https:"].includes(parsed.protocol))
    throw new Error("Supabase URL must use HTTP or HTTPS.");
  let isSecret = key.startsWith("sb_secret_");
  if (key.startsWith("ey")) {
    try {
      isSecret ||=
        JSON.parse(
          atob(key.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")),
        ).role === "service_role";
    } catch {
      throw new Error("Supabase client key is invalid.");
    }
  }
  if (isSecret)
    throw new Error(
      "Never configure a secret or service-role key as a public client key.",
    );
  return { url, key };
}
export function backendConfig() {
  return resolveBackendConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
export const safeAuthDestination = (value: string | null) =>
  value === "/reset-password" ? "/reset-password" : "/pos";
