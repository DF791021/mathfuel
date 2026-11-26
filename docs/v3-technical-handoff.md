# MathFuel v3 technical handoff

Reviewed November 25, 2026, Chicago time.

## Source and live deployment

| Surface | Observed state |
| --- | --- |
| GitHub `develop/v3` and `main` | Both at `d68070c9c1edfb07dcafe90a064ec19ae3701704` at audit start |
| Draft PR #6 | Mission and workshop commits through `a52a737` on `feature/ten-missions-parent-progress`. Review them against v3 before merging. |
| Shop | Later local commit `639d53f` builds on PR #6 and is still local. Preserve it as a distinct review item. |
| `mathfuel.org` | Home returns HTTP 200 through Netlify. Read-only tRPC requests returned HTTP 502 with a Stripe constructor error. The repository has the matching import-time Stripe initialization. The live deployment's Git commit and database are unverified. |

The preview change delays Stripe construction until a configured webhook request and keeps the raw request body for verification. It carries forward the existing PR #6 safeguards for account registration, password-hash exclusion and configured recovery links. It also restores the admin restriction on direct child linking. The live deployment requires a separate release decision. If production recovery is urgent, verify the exact Netlify deploy source before building a narrow fix against it. A platform move and a database migration can then be validated independently.

## Vercel preview

The repository contains a Vite deployment configuration, an Express API function, and a sample environment file. The standard local server uses the same API application. Browser navigation falls back to the SPA while API requests and assets use their own routes.

1. Link a branch-based Vercel Preview to the repository. Keep the production domain and production branch settings as they are. Use Node 24 and the locked pnpm version. Set `ENABLE_EXPERIMENTAL_COREPACK=1` if needed to use the version specified in `package.json`.
2. Set Preview-only `DATABASE_URL` to a disposable MySQL database with fictional accounts for this first hosting check. Set a separate `JWT_SECRET`, `VITE_APP_ID`, and the canonical preview origin as `PUBLIC_APP_URL`. Enable optional providers only with test configuration. Keep production credentials out of Preview. This phase has no dependency on Supabase.
3. Verify a cold request to `/api/trpc/auth.me?batch=1`, a direct visit to `/login`, and that a missing API route returns JSON 404. With the disposable database, exercise signup/login, signed cookies, practice save and reload, invite redemption and linked-parent visibility. Confirm a second parent cannot read the same learner’s results. Repeat with the mission and shop changes after their review. Check recovery email only against a controlled recipient and verify the configured host. Stripe testing uses signed test events.
4. Check error logs, timing and connection counts before considering any DNS or domain move. Record the deployed commit, rollback deployment, and expected effects on writes.

## PostgreSQL decision

Use Supabase for managed PostgreSQL in a separate preview project first. Keep Express/tRPC and the current authentication model during the first comparison. Use a private application schema, a least-privilege server role, and a separate migration role. Disable the Data API if this project uses the server-side driver exclusively. Use a TLS transaction-pooler connection for the Vercel runtime with a bounded driver pool and prepared statements disabled for the shared transaction pooler. Use a direct or session connection for migrations and rehearsal. [Supabase connection settings](https://supabase.com/docs/guides/database/connecting-to-postgres) and [data access controls](https://supabase.com/docs/guides/database/secure-data).

The checked-in MySQL snapshot has 22 tables, 16 enum columns, eight JSON columns, 51 timestamp columns, nine automatic update timestamps and zero declared foreign keys. Four SQL migrations are journaled and 25 are outside the journal. Manual migration scripts also exist. PR #6 and the local shop add their own migration history, so each candidate release requires its own inventory. Use the journal plus a verified source database schema and applied migration log to establish what to port. Compare the source's exact table casing, constraints, indexes and MySQL collations. Resolve duplicate keys and orphan records before adding constraints. Keep IDs and reset PostgreSQL identity sequences after importing explicit IDs.

| MySQL behavior | PostgreSQL work |
| --- | --- |
| Duplicate-key user upsert | Establish the `openId` conflict target and verify that an update preserves omitted fields. Test email normalization and duplicate handling against the source collation. |
| MySQL result `insertId` | Use `RETURNING` in the five current database helpers. Compare caller-visible response shapes. |
| `RAND()` and date bucketing | Replace with PostgreSQL equivalents. Test date boundaries using explicit UTC transport and the intended application time zone. |
| JSON, enum and automatic timestamps | Pick JSONB and explicit validated state fields. Preserve null handling and update semantics, including raw SQL writes. |
| Invite, reset and practice writes | Make multi-step changes atomic and test retries and contention. Existing dashboard tests alone do not establish durable parity. |
| Starter data, auth and learner records | Use synthetic fixtures first. Verify password hash compatibility, key counts, normalized row digests, totals by learner, parent links, and sequence positions. Set a separate policy for transient recovery and invite tokens. |

The Python audit is read-only and can run from either branch. The SQL rehearsal covers a three-table slice with fictional rows. It asserts source ID preservation, identity advancement, a linked-parent join, timestamp and JSON fidelity, duplicate and orphan link rejection, and schema access restrictions. It rolls back all objects. Run it on a disposable database using a configured PostgreSQL service that identifies only that database.

```sh
python3 scripts/audit_mysql_migrations.py
PGSERVICE=mathfuel_preview psql -X -v ON_ERROR_STOP=1 -f scripts/postgres/preview-rehearsal.sql
```

The full port still needs a PostgreSQL schema and an application data-access implementation, plus live Vercel and Supabase verification. Before any production data transfer, prove a restore, reconcile a complete staged copy, test public and authenticated flows and agree on a write freeze or a verified synchronization method. A hosting rollback alone does not recover writes made solely to a new database.

## Local verification

- Frozen pnpm install, TypeScript and the normal production build completed.
- All 141 Vitest cases passed. The four new cases exercise the preview API entry, cache controls, Stripe signature handling and account data boundaries.
- Vercel CLI emitted preview routing, static files and a Node 24 function using local fixture project settings. The generated route patterns matched the intended URLs, and the packaged function served local HTTP requests. The Vercel builder printed Express type-resolution diagnostics even though the application TypeScript check passed. A deployed Vercel preview still needs verification.
- The Python inventory rejected a fixture with a missing journaled SQL file. The PostgreSQL rehearsal passed in PGlite and the schema rolled back. Managed Supabase connectivity, the hosted database role and the complete MySQL-to-PostgreSQL import still need verification.
