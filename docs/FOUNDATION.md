# Next.js conversion: first-step foundation

This document describes the domain foundation introduced in the first implementation step. It is now used by the full Next.js application. See [the README](../README.md) for current setup and [the implementation plan](superpowers/plans/2026-10-29-nextjs-supabase.md) for delivery progress.

## Run the verified foundation

Use Node.js 22+ and install the pinned dependencies with `npm ci`.

```powershell
npm test
npm run typecheck
npm run lint
# Or run all currently available foundation checks:
npm run check
```

The domain tests cover real behavior and are supplemented by configuration/report tests, migration-based PostgreSQL checks, browser workflows, and a production build. `npm run check` runs the current unit/database/lint/type/build checks; `npm run test:e2e` verifies browser flows.

## Interfaces

`AppData` in `src/lib/types.ts` is the shared snapshot contract for demo data and the later Supabase gateway. The public domain facade is `src/lib/domain.ts`:

- `applyCommand(snapshot, command, options?)` returns a cloned snapshot after a validated operation. A failed operation leaves the original untouched. UUID command IDs are idempotent; reusing one for different contents fails.
- `calculateCart(products, items, discount)` combines duplicate product lines, validates total stock demand, and computes totals from product prices. It never accepts client totals.
- `businessDate(date)` uses Asia/Manila. `money(amount)` formats Philippine pesos. `toCSV(headers, rows)` quotes cells and neutralizes text formulas.
- `auditStock(snapshot)` compares the movement ledger with product stock. Explicit repair appends a compensating movement; it never rewrites history.
- `drawerBalance(snapshot, date)` includes reversals, excludes count observations, and enforces the amount range.
- `createDemoData(date?)` creates 30 fictional sample products and representative transaction histories with balanced stock ledgers. Pass a fixed date for deterministic fixtures.

The local domain is a pure demo transaction engine, **not** a substitute for database RLS, authentication, or concurrent transaction handling. Live installs must use the Postgres RPC implementation from the next task. No production records or credentials are included in the fixture.

## Deliberate behavior

Money has two decimal places and quantities have three. Nonfinite numbers, excessive precision, and amounts outside `numeric(12,2)` / `numeric(12,3)` are rejected. Line totals use integer arithmetic and half-up rounding. A discount cannot exceed the subtotal.

Void operations restore stock and refund only the cash collected. Credit sales with later repayments cannot be voided until those repayments are reconciled. Initial downpayments and previous receipt prices remain in history. A fully discounted sale creates no zero-amount debt.

Physical counts record observations even when the difference is zero. Expense refunds and debt cash receipts affect the current drawer day; their annotated expense/payment date remains separate. Drawer counts store actual cash and variance without changing expected cash.

Current runtime validation accepts untrusted JSON commands. Owner checks in the demo model are behavior previews; the live role must later come from protected Supabase membership records, never browser state.
