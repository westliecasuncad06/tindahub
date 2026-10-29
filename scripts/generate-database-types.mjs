import { writeFile, mkdir } from "node:fs/promises";
import { createTestDatabase } from "./database-fixture.mjs";
const db = await createTestDatabase();
try {
  const cols = (
    await db.query(
      "select table_name,column_name,data_type,is_nullable from information_schema.columns where table_schema='public' order by table_name,ordinal_position",
    )
  ).rows;
  const map = {
    uuid: "string",
    text: "string",
    boolean: "boolean",
    numeric: "number",
    smallint: "number",
    integer: "number",
    date: "string",
    "timestamp with time zone": "string",
    jsonb: "Json",
  };
  let out =
    "// Generated from versioned migrations by npm run db:types. Do not hand-edit.\n";
  out +=
    "export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\n";
  out += "export type Database = { public: { Tables: {\n";
  for (const name of [...new Set(cols.map((c) => c.table_name))]) {
    out += "  " + name + ": { Row: {\n";
    for (const col of cols.filter((c) => c.table_name === name))
      out +=
        "    " +
        col.column_name +
        ": " +
        (map[col.data_type] ?? "unknown") +
        (col.is_nullable === "YES" ? " | null" : "") +
        ";\n";
    out += "  }; Insert: never; Update: never; Relationships: [] };\n";
  }
  out += `}; Views: Record<never, never>; Functions: {
    app_snapshot: { Args: { p_store_id?: string | null }; Returns: Json };
    app_command: { Args: { p_store_id: string; command: Json }; Returns: Json };
    create_store: { Args: { store_name: string; owner_name: string }; Returns: Json };
    add_staff: { Args: { p_store_id: string; p_email: string }; Returns: undefined };
  }; Enums: Record<never, never>; CompositeTypes: Record<never, never> } };\n`;
  await mkdir("src/lib/supabase", { recursive: true });
  await writeFile("src/lib/supabase/database.types.ts", out);
  console.log(
    "Generated read-only table types and RPC contract from migrations.",
  );
} finally {
  await db.close();
}
