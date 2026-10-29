import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { backendConfig, safeAuthDestination } from "@/lib/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (backendConfig()) {
    const client = await serverClient();
    const code = url.searchParams.get("code");
    const hash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");
    const result = code
      ? await client.auth.exchangeCodeForSession(code)
      : hash && (type === "recovery" || type === "signup" || type === "email")
        ? await client.auth.verifyOtp({ token_hash: hash, type })
        : null;
    if (result && !result.error) {
      const response = NextResponse.redirect(
        new URL(safeAuthDestination(url.searchParams.get("next")), url.origin),
      );
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }
  return NextResponse.redirect(
    new URL("/login?error=verification", url.origin),
  );
}
