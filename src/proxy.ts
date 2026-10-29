import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { backendConfig } from "./lib/config";

export async function proxy(request: NextRequest) {
  const config = backendConfig();
  if (!config) return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        if (headers)
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const publicRoute =
    /^\/(login|signup|forgot-password|reset-password|auth\/callback)(\/|$)/.test(
      request.nextUrl.pathname,
    );
  if (!user && !publicRoute) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|brand/|favicon.ico|manifest.webmanifest).*)",
  ],
};
