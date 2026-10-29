# Verification record

Date: 2026-10-29. Scope: the Next.js conversion, browser-local demo, and ready-to-apply Supabase database files.

## Evidence

- Final local results: **36 unit tests, 34 PostgreSQL checks, and 10 browser scenarios passed**, with clean ESLint, TypeScript, and production build output.
- Unit tests exercise the real domain/config/report calculations: money and fractional quantities, aggregated cart demand, rollback, idempotent requests, voids, credit payments, expense reversal, physical counts, owner restrictions, ledger repair, dates, CSV formula handling, configuration failures, and report totals.
- `npm run test:db` applies the versioned schema and transaction migrations to embedded PostgreSQL. It verifies checkout/credit/count/expense behavior, rollback, receipt idempotency, stock ledger balance, direct-write denial, protected helper grants, two-store RLS isolation, staff restrictions, anonymous RPC denial, and private placement of privileged functions.
- Browser tests cover cash checkout and printable receipts, inventory creation/persistence, manual and sale-linked credit, repayment, physical counts, cash entries, CSV download, store settings, language/theme persistence, quick picks/keyboard shortcuts, phone checkout/dialog Escape, and an explicit demo-only auth entry when unconfigured.
- Every operational screen is checked for page-wide overflow at widths **320, 375, 390, 768, 1024, 1440, and 1920 px**.
- Local screenshots were rendered and inspected for desktop POS/dashboard and phone POS/inventory/login. The screenshot smoke script also checks browser runtime errors.
- A fresh production server returned HTTP 200 with private/no-store caching, completed cash checkout with zero browser runtime errors, and produced a readable 58 mm receipt PDF. Phone physical-count and dark tablet dashboard screenshots were also inspected after review fixes.
- TypeScript, ESLint, and the production build are checked through `npm run check`.

## Repaired regressions

- A repeated checkout cannot create a second sale or a second stock deduction; reusing a request key for different contents fails.
- Aggregate cash and derived variance are bounded before accepting records. Failed mutations preserve the original state.
- A matching physical count records a zero-difference observation instead of disappearing from history.
- Fully discounted credit checkout does not try to create an invalid zero-amount debt.
- Explicit null price/stock values cannot silently reset numeric fields.
- SVG chart tooltip titles use one string value; the browser regression checks for hydration/runtime errors.
- Print CSS preserves the visible receipt and hides catalog content. A print-media browser assertion protects against blank receipt output.
- Language preferences are reflected in server-rendered workspace pages through a preference cookie; live data never changes mode due to an error.
- Financial forms retain their request UUID across failed responses. A browser regression persists a payment, simulates a lost acknowledgement, retries, and confirms only one payment is recorded.
- Physical counts send only deliberately observed products, including explicitly confirmed matching quantities. Optimistic stock checks reject stale observations; an untouched product sold elsewhere is never restored by an unrelated count.
- Cart lines, stock valuation, and missing-stock cost use the same integer-centavo rounding as transaction records, including the half-cent case of 0.29 × 0.5.

## Explicit limits

- **No hosted Supabase project was created or modified.** Auth integration and typed RPC calls are implemented, but hosted email delivery, live PostgREST settings, and account verification must be exercised after the user's dedicated project is configured.
- Embedded database tests use minimal Auth identity/role fixtures. They exercise actual SQL constraints/functions/RLS, but do not represent a multi-connection performance/load test or an external security audit.
- Browser verification uses Chromium; it is not cross-browser or full accessibility certification. Hosted session recovery and Auth email flows remain part of live-project verification.
- The browser-local demo is sample data, not production offline support. Supported browsers use Web Locks to serialize demo changes across tabs; a fallback serializes operations within one tab.
- No private MySQL records were imported. The previous source remains locally preserved; the migration procedure is documented separately.
- Report previews show up to 200 rows; CSV and browser printing include all matching report rows. PDF output uses the browser's Save as PDF option.
- Deployment hosting and a live domain were not requested. The deliverable is the repository and Supabase setup files.

## Reproduce

```powershell
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
```

For screenshots, start the dev server first and run `npm run test:visual`. Test output, screenshots, and traces remain ignored by Git.
