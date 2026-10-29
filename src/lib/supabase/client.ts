"use client";
import { createBrowserClient } from "@supabase/ssr";
import { backendConfig } from "../config";
import type { Database } from "./database.types";
export function browserClient() {
  const config = backendConfig();
  if (!config) throw new Error("Supabase is not configured.");
  return createBrowserClient<Database>(config.url, config.key);
}
