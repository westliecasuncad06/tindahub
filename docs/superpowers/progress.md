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

- Task 1: complete (base ed17185; verification: npm run check → 29/29 tests, clean lint and TypeScript). Supabase/auth/UI and the final main-branch delivery remain pending.


## 2026-10-29 — Tasks 2 and 3

- Task 2: complete. Created versioned migrations through the Supabase CLI, normalized tables, composite store foreign keys, read-only client grants/RLS, private guarded mutation handlers, invoker RPC wrappers, Auth SSR/browser clients, cookie refresh proxy, verification/reset callbacks, onboarding, account settings and staff access.
- Ruling: use embedded PostgreSQL with minimal Auth identity fixtures for repeatable database checks — no live project exists or was authorized; this exercises the actual migrations but leaves hosted Auth/email/PostgREST and load testing for connection time.
- Ruling: serialize each store's mutations with its store row lock — this protects checkout, receipt numbers, inventory, and cash consistently; it trades maximum concurrent write throughput for a clear small-store correctness model.
- Ruling: real stores start empty while the browser-local demo uses fictional data — no private legacy data is imported; owners add real stock or follow the documented private migration procedure.
- Task 3: complete. Implemented all operational routes and responsive orange/cream/green styling, original brand assets, Filipino/English preferences, dark mode, native dialogs, local font assets, keyboard shortcuts/frequent picks, CSV reports and print/PDF layouts.
- Demo storage uses Web Locks where supported and an in-tab queue fallback; configured Supabase mode never silently uses demo data.
- Verified RED→GREEN fixes for missing SQL cart/count arrays, accidental public-secret configuration, SVG tooltip hydration, and blank receipt printing. Added preference cookies to keep workspace language stable across server-rendered navigation.
- Verification: 34 unit tests, 32 PostgreSQL checks, 7 browser scenarios. Responsive overflow checks cover 9 routes at 320/375/390/768/1024/1440/1920 px. Visual smoke generated five screenshots with zero page errors; representative images were inspected.
- Documentation: new setup guide, one-time SQL bundle, optional private legacy migration procedure, current README, verification limits, generated database types, and CI workflow.
- Task 4: independent whole-change review, final production verification and main-branch delivery pending.

## 2026-10-29 — Task 4 verification and review

- One independent whole-change review completed. Accepted both important findings: financial forms need a stable request key when a response is lost, and physical counts must not overwrite untouched stock from a stale snapshot.
- Ruling: retain each form's request UUID until success/close, and send only deliberately observed count rows with expected stock. Explicit matching-count confirmation preserves audit observations; changed stock requires a refreshed observation. Request payload changes after an uncertain commit are rejected rather than creating another financial entry.
- Final: lost-payment-acknowledgement regression RED→GREEN; retry records one payment.
- Final: stale count and untouched concurrent-sale regressions RED→GREEN in domain, PostgreSQL, and browser layers.
- Ruling: regrade the review's minor fractional-display finding as important for financial consistency. Cart line totals and inventory/missing-stock valuation now share the authoritative integer-centavo helper; fractional cart and valuation regressions RED→GREEN.
- Declined/deferred review scope: hosted Auth/email/PostgREST/session recovery, multi-connection load testing, cross-browser/full accessibility certification, private historical import, and deployment remain documented limits. No live Supabase project exists, and the user requested database preparation only; these are not claimed verified.
- Final local verification: `npm run check` passed (36 unit tests, 34 PostgreSQL checks, lint, TypeScript, production build); all 10 Chromium browser scenarios passed, including nine operational routes at seven widths from 320 to 1920 px.
- Production smoke: HTTP 200, private/no-store caching, cash checkout, readable 58 mm receipt PDF, and zero page errors. Inspected phone count and dark tablet dashboard screenshots after review fixes. Production dependency audit reports zero vulnerabilities; publishable files contain no detected credentials or private legacy records.
- Task 4 complete. Implementation commit `c72fd01e31a88613748273b7bf4c444a70f4803e` was fast-forwarded into `main` and pushed to `westliecasuncad06/tindahub` alongside the feature branch. `git ls-remote origin refs/heads/main` returned that exact SHA; no force push was used. This final documentation update records the verified delivery.
- GitHub Actions follow-up: all non-browser checks passed, but the owner workflow exposed a test synchronization race (search filled while the native save dialog was still closing). Added explicit successful-dialog closure assertions before subsequent interactions and a filtered-row assertion before repayment. The previously failing workflow passed locally after the correction; fresh CI runs the complete suite.
