# TindaHub Next.js + Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace PHP/MySQL with a polished responsive Next.js application and a ready-to-apply Supabase Postgres database, then push the result to the requested GitHub repository.

**Architecture:** A typed domain layer powers an explicitly labeled, browser-local demo and the real Supabase gateway. Supabase Auth protects configured installations; Postgres RPC functions validate and atomically apply financial and stock mutations. No live project is provisioned in this task.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS, Supabase Auth/Postgres, Node test runner, Playwright, embedded Postgres for database verification where available.

**Spec:** `docs/superpowers/specs/2026-10-29-nextjs-supabase-design.md`

## Global Constraints

- Keep POS, dashboard, inventory/count, debts, expenses, reports, cash drawer, settings, authentication, Filipino/English, and light/dark appearance.
- Currency is PHP, quantities support three decimals, business dates use Asia/Manila.
- Preserve the original source locally; exclude it, private records, credentials, screenshots, node_modules, and test artifacts from the public repository.
- Prepare schema and setup files only; do not mutate the unrelated campus Supabase project.
- Push to `westliecasuncad06/tindahub` after verification without force push.
- The user approved the design and explicitly instructed continuous implementation and push; no further design/execution selection is needed.

## Review Focus

- Duplicate checkout submission must return one sale and one stock deduction.
- Fractional quantities and centavo rounding must produce correct totals.
- Credit-sale voids must not erase repayments; overpayment and negative amounts must be rejected.
- Supabase configuration errors must show an error instead of silently switching real data to demo.
- Small screens, zoom, and keyboard dialogs must remain usable without page-wide overflow.

### Task 1: Typed domain and application foundation

**Files:** `package.json`, TypeScript/Next/lint configuration, `src/lib/{types,domain,demo}.ts`, `tests/unit/domain.test.ts`, `.gitignore`.

**Interfaces:** `AppData`, `Command`, `applyCommand(data, command)`, `calculateCart(products, items, discount)`, `businessDate(date)`, `createDemoData(now)`.

- [x] Write tests for duplicate item aggregation, cash/change rounding, stock rejection without mutation, credit/debt payment, void restoration, idempotency, count reconciliation, and Philippine midnight.
- [x] Run the tests and observe missing behavior.
- [x] Implement domain operations and deterministic demo fixtures, then run the full unit suite.
- [x] Initialize a Git branch in the existing non-Git workspace; preserve old source through ignore rules and local backup instead of another worktree.

Task 1 implementation is split into `domain.ts` (command boundary), `types.ts`, `validation.ts`, `cart.ts`, `money.ts`, `dates.ts`, `csv.ts`, `command-context.ts`, and focused `commands/{sales,inventory,finance}.ts` modules. `demo.ts` generates fictional, deterministic sample records through those same commands. This keeps the shared contract compact without collecting all business behavior in one file.

Task 1 validation: 29 domain tests, TypeScript, lint, and a production-dependency audit. Next.js route scaffolding, browser checks, and a production build are still owned by Task 3; no app routes exist yet.

### Task 2: Supabase database, security, and authentication

**Files:** `supabase/config.toml`, `supabase/migrations/*.sql`, `supabase/tests/*.sql`, `src/lib/supabase/{client,server,gateway}.ts`, `src/proxy.ts`, auth routes/components, `.env.example`, `docs/SUPABASE_SETUP.md`.

**Interfaces:** the same `AppData`/`Command` boundary from Task 1; `loadData()` and `executeCommand(command)` in the gateway, `app_snapshot()` and `app_command(command jsonb)` RPCs in Postgres.

- [ ] Write executable database tests for two-store isolation, unauthorized RPCs, atomic checkout, duplicate requests, rollback, stock ledger, voids, and debt repayment.
- [ ] Run them against the empty fixture database to observe absent schema.
- [ ] Implement all tables, ownership/RLS, grants, transactions, owner bootstrap, and typed SSR/browser clients.
- [ ] Verify database behavior and auth validation; supply instructions for the later live project, without claiming live Supabase verification.

### Task 3: Complete responsive application

**Files:** `src/app/**`, `src/components/{app-shell,provider,ui,auth-form}.tsx`, `src/features/{pos,inventory,dashboard,debts,expenses,reports,settings,cash-drawer}.tsx`, `src/lib/{i18n,reports}.ts`, `src/app/globals.css`, `public/brand/**`, `tests/e2e/*.spec.ts`.

**Interfaces:** `useStore()` exposes data, loading/error, command execution, and preferences; features use only this contract.

- [ ] Write browser scenarios for navigation, checkout, credit repayment, inventory/counts, expenses/drawer, settings/preferences, report CSV, and responsive overflow.
- [ ] Run scenarios against the initial app to observe missing features.
- [ ] Implement the approved visual direction and all feature flows with shared accessible dialogs, loading/error/empty states, CSV, and print layouts.
- [ ] Run unit, database, lint, typecheck, production build, and browser checks; inspect actual screenshots at phone/tablet/desktop sizes.

### Task 4: Review and delivery

**Files:** `README.md`, `docs/VERIFICATION.md`, `.github/workflows/ci.yml`, final review fixes.

- [ ] Document clean setup, demo versus real database behavior, schema application, optional legacy migration, and test commands.
- [ ] Run one independent whole-change review, resolve important findings with regression tests, and run the complete checks.
- [ ] Scan publishable files for private data and secrets; commit, push using GitHub connector if local Git networking is unavailable, and verify the remote commit.

