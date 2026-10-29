"use client";
import { browserClient } from "./client";
import type { Json } from "./database.types";
import type { AppData, Command } from "../types";

function snapshot(value: unknown): AppData {
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== 2 ||
    !("products" in value) ||
    !Array.isArray(value.products)
  )
    throw new Error(
      "Unexpected database response. Apply the TindaHub migrations first.",
    );
  return value as AppData;
}
export async function loadData(storeId?: string) {
  const { data, error } = await browserClient().rpc(
    "app_snapshot",
    storeId ? { p_store_id: storeId } : {},
  );
  if (error) throw new Error(error.message);
  return snapshot(data);
}
export async function executeCommand(storeId: string, command: Command) {
  const { data, error } = await browserClient().rpc("app_command", {
    p_store_id: storeId,
    command: command as unknown as Json,
  });
  if (error) throw new Error(error.message);
  return snapshot(data);
}
