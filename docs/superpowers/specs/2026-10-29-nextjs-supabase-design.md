# TindaHub Next.js and Supabase conversion — proposed design

Status: approved by the user. The typed domain, Supabase migrations/auth integration, and application screens are implemented. Final verification/review and repository delivery are in progress. The user asked to prepare Supabase files without creating or changing a live project.

## Intent

Convert the existing Philippine sari-sari store application from PHP/MySQL to Next.js and Supabase Postgres, improve the interface across screen sizes, verify the complete workflows, and push the finished application to https://github.com/westliecasuncad06/tindahub.git.

The user explicitly chose Next.js, Supabase Postgres, responsive restyling, and the destination repository. The architectural and visual details below are recommendations from the implementer.

## Current system and evidence

- PHP routes in `index.php` cover POS, dashboard, inventory, physical counts, debts, expenses, reports, settings, login, and signup. `/utang` aliases debts.
- Eleven tables appear in `database/schema.sql`: categories, products, sales, sale_items, stock_movements, cash_drawer, expenses, settings, customer_debts, debt_payments, and users.
- `database/migrate_debts.php` adds sale credit fields missing from the base schema. The new schema must incorporate both sources.
- The declared debt status `partially_paid` differs from the manual debt API's `partial`. Migration must normalize these values.
- PHP business libraries use database transactions and row locks for sales, voids, stock changes, debt payments, and physical counts.
- Stock movements form a ledger. Product stock must equal the sum of its movement quantities.
- Physical count history currently comes from stock movements of type `count`.
- The existing UI supports Filipino/English, light/dark appearance, decimal quantities, PHP currency, keyboard shortcuts, receipts, CSV downloads, and printable reports.
- The current header automatically signs into a default account. Several data APIs have no visible authentication or store ownership checks. The replacement must enforce access at the server and database layers.
- The local directory has no Git repository. The destination GitHub repository is empty, public, and accessible with push permission.
- Connected Supabase discovery returned only `elevate-campus-hub`. No TindaHub project has been selected.
- A read-only local MySQL connection failed because the server is unavailable. Existing row counts and data integrity are unverified.

## Approaches

1. **Complete Next.js and Supabase conversion (recommended):** React replaces the PHP views, Next.js handles authenticated server operations, Supabase provides Auth and Postgres, and SQL functions preserve atomic business operations. This directly implements the requested stack, with the largest initial migration effort.
2. **Next.js frontend with transitional PHP backend:** reuses PHP business logic initially, but retains PHP/MySQL hosting and requires a second backend migration. This only partially satisfies the request.

The user approved approach 1 and delegated implementation details.

## Scope and preserved behavior

| Area | Required behavior |
| --- | --- |
| Authentication | Sign up, login, logout, password reset/change, protected application routes |
| POS | Product and SKU search, categories, frequent products, cart quantity edits, discount, cash/change, credit checkout and downpayment, receipt printing |
| Sales | List/detail, immutable recorded prices and costs, atomic checkout, single void with stock and cash/debt reversal |
| Inventory | Products and categories, price/margin preview, decimal stock, expiry and low-stock filters, restocking, spoilage/removal, soft archive, movement history |
| Physical count | Count products, reconcile quantities atomically, view resulting differences and loss value |
| Debts | Manual debt, credit sale linkage, customer search, due date, partial/final payment, payment history and summary |
| Cash drawer | Opening balance, deposits, payouts, expected cash, end-of-day actual count and variance |
| Dashboard | Date ranges, sales/COGS/gross profit/expenses/net profit, comparisons, top products/categories, low stock, target progress |
| Expenses | Create, list, filter, delete with cash-drawer consistency where applicable |
| Reports | Inventory, movements, low stock, sales, profit summary, physical counts, expenses; CSV and browser-printable PDF |
| Settings | Store and receipt details, profit target, language, appearance, account password, ledger audit |

Retain `/pos`, `/dashboard`, `/inventory`, `/inventory/count`, `/debts`, `/expenses`, `/reports`, `/settings`, `/login`, and `/signup`. Redirect `/utang` to debts and the root to the authenticated POS or login.

## Architecture

- Use the current supported stable Next.js App Router, React, and TypeScript. Verify and pin dependency versions during implementation, and commit the lockfile.
- Use server-rendered authenticated layouts and initial reads. Client components handle POS interaction, forms, filters, preferences, charts, and responsive navigation.
- Share typed validation, currency/quantity utilities, translations, and small reusable UI primitives.
- Use Supabase Auth email/password with cookie-based SSR clients and server-verified identities. Support verification and password recovery callbacks.
- Use the Supabase publishable key in browser code; never expose service credentials. Do not cache authenticated data across users.
- Model stores and memberships explicitly. A signup creates an owner and a store; staff access is granted by an authorized owner. Membership and role data are not derived from user-editable auth metadata.
- Apply RLS and ownership predicates to every exposed business table. Membership checks must cover parent-child relationships, not just possession of a UUID.
- Validate every mutation on the server/database. Protect financial and inventory records from direct client writes that could bypass transaction functions.

## Postgres model and transactions

Add stores, profiles, and store_members to the existing business concepts. All business records carry a store identifier. Preserve legacy IDs through migration mapping where identifiers change, and preserve original timestamps, receipt numbers, and recorded monetary values.

Use fixed precision numeric money and quantity columns. Currency calculations round to centavos; quantities support three decimal places. Use timezone-aware timestamps and compute business dates in Asia/Manila.

Implement narrowly granted SQL transaction functions for checkout, void, stock adjustment, physical count, debt creation/payment, and drawer operations. Prefer invoker security; any required elevated function must explicitly verify identity, store membership, and role, set a safe search path, and revoke broad execution privileges.

Checkout loads authoritative product prices, combines duplicate product IDs, locks products in a stable order, validates quantities and payment, and writes sale, items, stock ledger, cash, and debt together. Use an idempotency key and database-backed receipt sequencing to avoid duplicate sales and receipt races. Never trust client-supplied totals.

Voiding is performed once, with compensating ledger entries and consistent debt/payment treatment. Reject voiding a credit sale with later repayments until repayments are explicitly reconciled; explain the reason in the UI. Existing completed sales retain their original line-item prices and costs.

Stock deductions cannot exceed available stock. Debt payments cannot exceed the outstanding balance. Ledger entries are append-only; corrections use compensating entries. Ledger audit reports mismatches; an explicit repair action is owner-authorized and audited.

## Responsive visual direction

Preserve the existing TindaHub logo and warm orange brand. Use a restrained neighborhood-store visual identity: warm off-white surfaces, ink-colored typography, orange primary actions, clear tabular figures, and green/red reserved for status and money movement.

- Desktop: persistent navigation, generous work area, catalog/cart POS split, readable dense tables, and a clear financial summary.
- Tablet: compact navigation, adaptable product columns, and a cart layout that remains usable in portrait and landscape.
- Phone: accessible navigation, single-column forms, readable record cards, sticky cart total, and a full-height checkout sheet with safe-area spacing.
- Test representative widths of 320, 375, 390, 768, 1024, 1440, and 1920 pixels. Content should reflow without page-wide horizontal overflow.
- Use consistent touch targets, visible keyboard focus, associated labels, dialog focus management, text error messages, reduced-motion support, accessible contrast, and browser zoom.
- Keep Filipino/English and light/dark preferences. Display loading, empty, failure, pending, and success states throughout the application.

## Data migration and setup

Prepare versioned Postgres migrations, generated database types, safe environment examples, local setup instructions, and an optional sample dataset isolated from real data.

If existing records are required, create a read-only MySQL exporter and validated import workflow: inspect the actual schema, map ownership and auth users, normalize legacy statuses, import in dependency order, reconcile table counts and financial totals, verify foreign keys and ledger balance, and retain the source database. Treat password migration separately through the documented Supabase Auth import process or a password-reset onboarding flow; never seed published default passwords.

Do not publish customer records, database dumps, credentials, screenshots containing personal information, node_modules, or test artifacts to the public repository. Preserve legacy source locally while converting; publish the completed Next.js application and necessary migration tools/documentation.

## Verification and delivery

1. Typecheck, lint, and production build.
2. Unit checks for money, decimal quantities, dates, and validation where behavior is nontrivial.
3. Database integration checks for checkout rollback, simultaneous stock contention, duplicate checkout requests, voids, partial payments, drawer reconciliation, and ledger invariants.
4. RLS tests with anonymous access and two stores to verify isolation and role restrictions.
5. Browser checks for the complete cashier/owner flows, auth recovery, language/appearance, report downloads and printing.
6. Inspect real browser screenshots at phone, tablet, and desktop sizes; check overflow, dialogs, forms, and navigation.
7. Scan staged files for secrets and private data, create a clean commit, push to the requested repository, and verify the remote commit. No force push.

A production deployment is outside the current request. GitHub push is explicitly authorized and does not require another permission question once the work is verified.

## Decisions clarified after review

1. Prepare versioned Supabase database files and setup instructions only. No live project should be created or changed in this task.
2. Do not import private records automatically. Preserve the PHP/MySQL source locally and provide fictional demo fixtures for initial testing.
3. Full-conversion design is approved; implementation details and the eventual GitHub push are authorized.

## Documentation checked

- Next.js installation: https://nextjs.org/docs/app/getting-started/installation
- Supabase SSR clients: https://supabase.com/docs/guides/auth/server-side/nextjs

The application is verified locally with domain/config/report tests, actual PostgreSQL migration tests, browser workflows, responsive/print checks, and production builds. No live Supabase database migration or hosted Auth/email flow has been performed; that remains a connection-time check for the user's future project. Delivery evidence is recorded in `docs/VERIFICATION.md`.
