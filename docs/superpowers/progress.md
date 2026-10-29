# Implementation ledger — plan: docs/superpowers/plans/2026-10-29-nextjs-supabase.md

- User approved the proposed design and requested ready-to-apply Supabase files only, with GitHub push when done.
- Ruling: execute in the current directory and initialize Git here — this is a non-Git source folder and the user asked to convert it; legacy files will remain locally but will be excluded from publication.
- Ruling: supply an explicit local demo when Supabase variables are absent — the user has no Supabase project yet; configured live mode will never silently fall back to demo.
- Ruling: no real-data import is run — MySQL is offline and no target project exists; provide migration instructions and preserve the source.
- Pre-flight interfaces: domain AppData/Command is the common gateway and UI boundary; Postgres RPC snapshots match that shape. Tests must verify both adapters use equivalent money and ledger semantics.
- Environment: local Git HTTPS access failed; GitHub connector is available as an authorized publishing fallback. Checking cached packages before dependency setup.
