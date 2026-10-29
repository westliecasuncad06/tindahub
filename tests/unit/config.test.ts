import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveBackendConfig,
  safeAuthDestination,
} from "../../src/lib/config.ts";

test("only an entirely unconfigured installation enables demo mode", () => {
  assert.equal(resolveBackendConfig("", ""), null);
  assert.throws(
    () => resolveBackendConfig("https://example.supabase.co", ""),
    /both/i,
  );
  assert.throws(
    () => resolveBackendConfig("", "sb_publishable_example"),
    /both/i,
  );
  assert.throws(
    () => resolveBackendConfig("not-a-url", "sb_publishable_example"),
    /URL/i,
  );
});
test("server secrets cannot be used as public client keys", () => {
  assert.throws(
    () =>
      resolveBackendConfig("https://example.supabase.co", "sb_secret_example"),
    /secret/i,
  );
  const jwt =
    "eyJhbGciOiJIUzI1NiJ9." +
    Buffer.from(JSON.stringify({ role: "service_role" })).toString(
      "base64url",
    ) +
    ".signature";
  assert.throws(
    () => resolveBackendConfig("https://example.supabase.co", jwt),
    /secret/i,
  );
});
test("whitespace around credentials does not bypass secret detection", () => {
  assert.throws(
    () =>
      resolveBackendConfig(
        "https://example.supabase.co",
        " sb_secret_example ",
      ),
    /secret/i,
  );
});
test("auth callbacks only redirect to allowed local destinations", () => {
  assert.equal(safeAuthDestination("/reset-password"), "/reset-password");
  assert.equal(safeAuthDestination("https://evil.example"), "/pos");
  assert.equal(safeAuthDestination("//evil.example"), "/pos");
});
