# Connect your Supabase project

The repository is Supabase-ready. No hosted project has been created, charged, or changed by this conversion. The app runs with an explicitly labeled browser-local demo until **both** public environment values are supplied.

## 1. Create a dedicated project

Create a new Supabase project for TindaHub in your chosen organization. Choose an appropriate region, keep its database password private, and wait for provisioning. Use a fresh database: these migrations create the TindaHub tables and restrict their client privileges.

Do not apply this schema to the unrelated campus project or an existing application database.

## 2. Apply the database

Choose one of these installation paths, not both.

**Simplest initial setup:** open the new project's SQL Editor, paste the entire contents of [`supabase/setup.sql`](../supabase/setup.sql), and run it once. This file is generated from the ordered migration files and wraps them in a transaction. Do not rerun it on an initialized database.

**CLI-managed setup:** install/use the official Supabase CLI, authenticate, link the new project, review the dry run, then push migrations:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list
```

The CLI may request the database password interactively. Never place it in a committed command, connection string, or public environment variable.

The SQL Editor bundle does not create CLI migration-history entries. For later upgrades of a bundle-installed project, first reconcile the migration history using the CLI's documented `migration repair` process; don't blindly push the initial migrations again.

## 3. Set the public API details

Copy `.env.example` to `.env.local`, then copy the **Project URL** and **publishable key** from the new project's Connect/API Keys interface:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

The key is intended for the browser. Never use a secret key or legacy `service_role` key here. TindaHub requires no service-role key in its frontend or server environment. A legacy `anon` key is accepted for compatibility, but the publishable key is preferred.

Restart `npm run dev` after changing these settings. For a production build, set them **before** running `npm run build`; Next.js embeds public values in browser bundles. A partial or invalid configuration shows an error instead of silently using demo records.

## 4. Configure email authentication

Enable email/password signup. For a hosted store, enable email confirmation and configure an SMTP provider suitable for your users.

Under Auth URL Configuration, set your actual application URL as the Site URL. Allow these callback URLs for your local setup:

- `http://127.0.0.1:3000/auth/callback`
- `http://127.0.0.1:3000/auth/callback?next=/reset-password`
- The equivalent `http://localhost:3000/...` URLs if you use localhost.

For hosting, add the equivalent HTTPS URLs for the real domain. Do not add arbitrary external redirect destinations. The app accepts a PKCE `code` callback and supported `token_hash` verification links. Custom email templates should use the proper Supabase confirmation URL or route their token hash to `/auth/callback` with the correct verification type.

## 5. Open your store

Run `npm run dev` and open `http://127.0.0.1:3000/signup`. Register, verify your email, and sign in. The first authenticated workspace visit asks for your name and store name. Creating the store is idempotent and grants ownership only of that new store.

Real stores start empty. Add your products in Inventory. Opening quantities create stock-ledger entries automatically. A staff member first registers/verifies their own email; the owner can then add that email in Settings. Staff can select an assigned store in Settings when they have several memberships. Roles come from protected membership records, not user-editable profile metadata.

## Protection model

- Every exposed table enables RLS. Reads are scoped by authenticated store membership.
- Clients have SELECT access only. Direct product, ledger, and financial writes are revoked.
- Public RPC entrypoints run as invoker. Guarded privileged handlers live in the unexposed `private` schema with fixed search paths, explicit identity/role checks, and restricted EXECUTE grants.
- All mutations for one store acquire its row lock. Checkout, receipt numbering, stock, cash, and credit writes commit or roll back together. This favors correctness for a sari-sari store over maximum write throughput.
- UUID request keys make retries idempotent. Historic line prices/costs remain unchanged. Voiding a credit sale with later repayments requires reconciliation first.
- The server validates users with Supabase Auth, refreshes cookie sessions in `proxy.ts`, and keeps authenticated responses private/no-store.

## Local database verification

```powershell
npm run test:db
npm run db:types
npm run db:bundle
```

The tests run the actual migrations in embedded PostgreSQL (PGlite) with minimal Auth user/role stand-ins. They check transaction behavior, RLS, permissions, rollback, and ledger invariants without a hosted project or Docker. Generated read-only table types come from those migrations. This does **not** verify a live project's email delivery, Auth service, PostgREST configuration, or multi-connection load behavior.

After connecting a real project, perform the signup → verification → store creation → product → cash/credit sale → repayment → report flow with two separate store accounts. Confirm that neither account can see the other's records, then run the project's Supabase security/performance advisors.

References: [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [CLI](https://supabase.com/docs/reference/cli/introduction).
