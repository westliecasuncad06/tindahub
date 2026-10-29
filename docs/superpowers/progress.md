# Implementation ledger — plan: docs/superpowers/plans/2026-10-29-nextjs-supabase.md

- User approved the proposed design and requested ready-to-apply Supabase files only, with GitHub push when done.
- Ruling: execute in the current directory and initialize Git here — this is a non-Git source folder and the user asked to convert it; legacy files will remain locally but will be excluded from publication.
- Ruling: supply an explicit local demo when Supabase variables are absent — the user has no Supabase project yet; configured live mode will never silently fall back to demo.
- Ruling: no real-data import is run — MySQL is offline and no target project exists; provide migration instructions and preserve the source.
- Pre-flight interfaces: domain AppData/Command is the common gateway and UI boundary; Postgres RPC snapshots match that shape. Tests must verify both adapters use equivalent money and ledger semantics.
- Environment: local Git HTTPS access failed; GitHub connector is available as an authorized publishing fallback. Checking cached packages before dependency setup.

## 2026-10-29 — Task 1 execution

- The user requested the first step. Local tools now execute successfully after the environment permission profile changed. Working branch: `feat/nextjs-supabase`, base `ed17185`.
- Installed exact dependencies and replaced the old incompatible lockfile. Registry-verified patch updates: Next.js 16.4.3, React/React DOM 19.3.1, Playwright 1.64.1, and PGlite 0.5.13. Supabase package versions remain pinned.
- Observed RED: the original domain suite could not import the absent domain implementation. Implemented typed snapshots, validated command handlers, canonical idempotency, stock ledgers, sales/voids, credit and debt payments, expenses, drawer reconciliation, settings, dates, CSV, and fictional demo data.
- Ruling: separate domain validation, money, cart, context, and command handlers into focused files instead of a single large `domain.ts` — this preserves the planned facade and makes the future Supabase adapter contract easier to review; the tradeoff is additional small modules.
- Validation initially found TypeScript's overly narrow inferred UUID test-argument type and lint paths pointing at future tasks. Annotated the test helper ID as `string`; lint now targets existing files. The Next navigation-link rule is excluded only from pure domain/config TypeScript files.
- Independent read-only review: no critical findings; identified missing aggregate cash/variance range checks and zero-difference count history.
- Review ruling: zero-difference counts are treated as an important audit-history issue — a successful physical count must remain inspectable even when every quantity matches. Record a zero-difference `count` movement; this costs one audit row per counted product.
- Final: fixed drawer aggregate/variance overflow — boundary regression RED→GREEN.
- Final: fixed missing count observations — matching-count history regression RED→GREEN.
- Final: fixed zero-total credit checkout attempting to create an invalid debt — regression RED→GREEN.
- Final: fixed explicit null product amounts silently resetting numeric fields — regression RED→GREEN.
- Review scope rulings: live Supabase/RLS/concurrency and cross-tab persistence belong to Task 2/3; authentication, screens, responsiveness, and production build belong to Task 3; actual private-record migration is intentionally not run; dependency release versions and production vulnerabilities were checked directly during this task. None of these unimplemented areas is claimed verified.
- Task 1 verification: `npm test` → 29/29; `npm run typecheck` → pass; `npm run lint` → pass; `npm audit --omit=dev --audit-level=high` → 0 vulnerabilities. Production build/browser checks are pending the application screens.
`n- Task 1: complete (base ed17185; verification: npm run check → 29/29 tests, clean lint and TypeScript). Supabase/auth/UI and the final main-branch delivery remain pending.
