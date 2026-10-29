# TindaHub

A responsive Next.js workspace for Philippine sari-sari stores, ready to connect to Supabase Postgres.

## Run it locally

Use **Node.js 22 or newer**.

```powershell
npm ci
npm run dev
```

Open **http://127.0.0.1:3000**. The new app runs on the Next.js server; the previous XAMPP `/store` URL still belongs to the preserved PHP application.

Without Supabase environment values, an explicitly labeled **demo workspace** opens with fictional sample products and transaction history. Demo changes are saved only in this browser, including across reloads and tabs. Reset the examples in Settings. This is not offline mode for a real store.

## Connect a real database later

Follow [the Supabase setup guide](docs/SUPABASE_SETUP.md). The repository includes:

- `supabase/setup.sql`: a one-time SQL Editor bundle for a **new, dedicated** project.
- `supabase/migrations/`: versioned schema and transaction migrations.
- `.env.example`: the public project URL and publishable-key settings.
- Generated database types and executable PostgreSQL security/business tests.

No live Supabase project is required to explore the demo. No hosted project was created or changed by this conversion. Real stores start empty and use Supabase Auth and Postgres; they never silently fall back to demo data when a connection fails. Never expose a secret or `service_role` key in public environment variables.

## What is included

| Workspace | Features |
| --- | --- |
| Point of sale | Product/SKU search, categories, frequent picks, quantity edits, discounts, live change, cash and credit checkout, downpayments, printable 58 mm receipts |
| Inventory | Products/categories, cost and margin preview, low/out/expiring stock filters, restocking, deductions, archive, movement history |
| Physical count | Actual quantities, stock reconciliation, missing-stock cost, audit entries even for matching quantities |
| Overview | Date filters, sales/COGS/gross/net profit, expenses, average sale, daily chart, top products, restock alerts, target progress, receipt view and owner-authorized voids |
| Customer credit | Manual debts, linked credit sales, partial/final payments, due dates, payment histories and balances |
| Expenses | Date/search filters, category records, optional cash payouts, audited payout reversal when deleted |
| Cash drawer | Opening float, deposits, payouts, daily expected cash, actual counts and variance |
| Reports | Seven source-backed reports, UTF-8 CSV, and browser printing / Save as PDF |
| Settings | Store/receipt details, daily target, language, light/dark theme, ledger checks, account password, and staff access |
| Authentication | Signup/login/logout, verification callbacks, password reset, store onboarding, membership-scoped data |

The interface supports Filipino and English, keyboard navigation, native dialogs, reduced motion, and responsive phone/tablet/desktop layouts.

### Cashier shortcuts

- `/`: focus product search.
- `Enter` in search: add the first matching product.
- `1`–`9` outside a form: add the corresponding catalog result.
- `F2`: checkout.
- `Esc`: close a dialog, or clear the cart when no dialog is open.
- `Space` on the success receipt: start a new sale.

## Financial and stock behavior

Money uses centavos and quantities support three decimals. The database calculates checkout totals from authoritative product prices, combines duplicate lines, rejects overselling/overpayment, and atomically records sales, stock, cash, and credit. A per-store row lock protects receipt sequencing and concurrent writes; UUID request keys make retries idempotent.

Stock movements are append-only through the app. Historical receipt prices/costs stay unchanged. Voids restore stock and reverse collected cash; credit sales with later repayments require reconciliation first. Cash counts record observations without changing expected cash. Expenses and debt cash receipts affect the current drawer day separately from their annotated business dates.

Every exposed table has RLS. Browser clients can read their store's records but cannot directly mutate business tables. Protected transaction handlers verify the current membership and owner role for restricted operations. User-editable metadata is never used as authorization.

## Verify

```powershell
npm run check       # Unit tests, real PostgreSQL migration tests, lint, types, production build
npm run test:e2e    # Browser workflows and 320–1920 px responsive checks
npm run db:types    # Rebuild read-only table types from migrations
npm run db:bundle   # Rebuild setup.sql from ordered migrations
```

Browser tests require Chromium: `npx playwright install chromium`. `npm run test:visual` captures local screenshots when a dev server is already running. Screenshots, traces, credentials, private dumps, and old application files are excluded from the public repository.

Database tests use embedded PostgreSQL with minimal Auth stand-ins. A live project's signup/email/PostgREST configuration and multi-connection deployment behavior still need to be verified after you create and connect it. See [verification details](docs/VERIFICATION.md).

For a production server, set the public Supabase values before the build, then run `npm run build` and `npm run start`. The demo remains clearly labeled if both settings are absent.

## Project structure

- `src/app`: App Router pages, protected workspace, auth callback, global styles.
- `src/components`: shell, provider, accessible dialogs/forms, authentication and receipts.
- `src/features`: operational store screens.
- `src/lib`: typed domain, calculations, reports, demo adapter, Supabase clients/types.
- `supabase`: normalized schema, RLS, guarded transactions, and local development configuration.
- `tests`: domain/config/report tests and browser scenarios.
- `scripts`: migration-based database tests, type generation, bundling, and screenshots.

The original PHP/MySQL source remains locally intact and ignored by this new public repository. Private historical records were not imported. See [the legacy migration procedure](docs/LEGACY_MIGRATION.md) if those records must be carried forward.
