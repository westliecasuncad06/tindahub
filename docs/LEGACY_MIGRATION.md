# Preserving and optionally importing the previous store

The PHP/MySQL source remains in this workspace under its original `api`, `assets`, `config`, `database`, `lib`, and `views` directories. They are ignored by Git for the new public Next.js repository. The old README/configuration copies are in `legacy-original` locally. No MySQL records were modified or imported into Supabase.

If the existing MySQL records must be carried forward, use a private migration workspace. Do not commit dumps, customer names, phone numbers, passwords, or database credentials to the public repository.

1. Back up the actual MySQL database and source before changing anything. Restore the backup to a private test database and inspect its real schema; the old app's base schema and later debt migration differ.
2. Create and verify the new Supabase owner through Auth. Create the destination store, and retain its store UUID and user-to-role mapping.
3. Export categories, products, sales/items, stock movements, debts/payments, expenses, settings, and cash entries read-only. Preserve original receipt numbers, timestamps, recorded prices/costs, quantities, and credit links. Normalize `partial` to `partially_paid`.
4. Map legacy integer IDs to UUIDs and assign the chosen store ID on every record. Preserve that mapping privately. Import in dependency order using an administrative connection in a controlled transaction; never grant browser clients direct write privileges to make an import work.
5. Reconcile row counts, foreign keys, sales totals, costs, expenses, debt balances, cash totals, and `products.stock_qty = sum(stock_movements.qty_change)`. Investigate mismatches before applying repairs.
6. Handle accounts separately through Supabase's supported Auth import process or a password-reset onboarding flow. Do not seed public default passwords or copy the old automatic-login behavior.
7. Verify a read-only comparison report and a representative receipt from both systems before switching the store. Retain the original database backup until the new installation is accepted.

This is a migration procedure, not an automatic importer. Actual private data and the live destination project were not available or requested for import in this task.
