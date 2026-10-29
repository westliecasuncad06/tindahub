import { readFile, readdir, writeFile } from "node:fs/promises";
const files = (await readdir("supabase/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort();
const sql = await Promise.all(
  files.map(
    async (f) =>
      "-- Migration: " +
      f +
      "\n" +
      (await readFile("supabase/migrations/" + f, "utf8")),
  ),
);
await writeFile(
  "supabase/setup.sql",
  "-- Apply once to a NEW Supabase project using its SQL Editor.\n-- For existing installs use versioned migrations, not this bundle.\nbegin;\n" +
    sql.join("\n") +
    "\ncommit;\n",
);
console.log(
  "Prepared supabase/setup.sql from " + files.length + " migrations.",
);
