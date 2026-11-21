# Ten missions: review build

## What this change delivers

Students can open **Make Ten** and **Bridge Through Ten** from their dashboard or `/missions`. Both missions contain five problems. Make Ten asks for the missing part of ten; Bridge Through Ten breaks each addition problem into making ten, finding the remainder, and adding that remainder to ten.

Every answer, opened hint, and step transition is written through an authenticated tRPC mutation. A run resumes at its saved step, including a solved step awaiting Next. The server computes correctness and result totals. A unique active-run key, transaction row lock, revision check, and action ID protect against duplicate starts, concurrent tabs, and retries after an uncertain response.

The linked parent's dashboard has a separate mission flight log for both missions. It shows completed results, refreshes on focus and every 30 seconds while active, and has an explicit refresh button. The server checks the parent role and current link on every mission-progress request. A failed refresh hides cached child results.

Legacy practice statistics are unchanged. Mission results live in `missionRuns` and appear in the new mission cards; they are not silently combined with the older practice-session/mastery model.

## How to read a result

- **Independent:** the whole problem was solved correctly on the first try with no opened hints. For Bridge Through Ten, all three steps must meet that standard.
- **First try:** every step was correct on its first answer; hints may have been opened.
- **Hints opened:** actual hint openings recorded by the server.
- Incorrect guesses remain part of the evidence after correction. Completion never rewrites that history.

An initial **pilot recommendation** marks a learner ready to build on a strategy after at least four of five problems are independent in two of the latest three completed missions, with the qualifying samples at least 18 hours apart. This threshold is a product hypothesis, not a scientifically validated mastery assessment. Speed is not scored. Both missions remain available so a parent or teacher can choose the appropriate practice.

## Recovery provenance

This implementation was reconstructed from the preserved Make Ten HTML prototype and the reported behavior of earlier local work. The earlier `MathFuel_Make_Ten_Integration.patch` and `MathFuel_Ten_Missions.patch` could not be recovered. This commit is not a byte-for-byte restoration of those patches.

No import of browser-local prototype history or an unknown earlier mission schema is claimed. The migration below creates a new table. Existing `practiceSessions`, problem attempts, and skill-mastery records are not modified. If an earlier unrecovered patch has been applied to any database, inspect that schema and the saved data before applying this migration; no automatic conversion of that unknown format is included.

## Authentication repairs included

1. Public signup cannot set a password on an existing OAuth account by knowing its email address. Existing accounts use login or emailed password recovery.
2. Password hashes are omitted from registration, login, and current-user responses.
3. Password-reset links use `PUBLIC_APP_URL` (default `https://mathfuel.org`), not request `Origin` or `Referer` headers.
4. The legacy direct-ID parent-link endpoint now uses the existing administrator middleware.
5. An unavailable account database causes a service error instead of apparent signup success.

These repairs address observed paths around the new learner/parent flow. They do not constitute a complete platform security review. Existing registration uniqueness, reset-token consumption, rate limiting, account/session revocation, and deployment configuration still need a separate release review.

## Schema and configuration

`drizzle/0004_ten_mission_runs.sql` adds `missionRuns`; the matching generated snapshot and journal entry are included. No database migration was applied to a production or staging database in this work.

Review the actual database schema and existing Drizzle journal before applying migrations. This repository already contains older SQL files outside the current journal; do not assume every numbered SQL file belongs to the current migration chain. On a disposable development database with the expected base schema, use the project's installed Drizzle migrator after review:

```sh
node_modules/.bin/drizzle-kit migrate
```

The existing application still requires `DATABASE_URL`, `JWT_SECRET`, and a nonempty `VITE_APP_ID`. Configure `PUBLIC_APP_URL` to the intended app origin when testing password recovery outside `mathfuel.org`. Supply the appropriate existing email configuration only when an authorized email test is intended.

## Verification performed

- The complete Vitest suite passed: **167 tests across 8 files**, including **30 new tests**.
- TypeScript `npm run check` passed.
- The client and server `npm run build` passed. Existing analytics-placeholder warnings remain when the optional analytics environment values are unset.
- The generated migration creates only the new mission table.
- An independent frontend/backend source review covered the mission state machine, save/retry behavior, role and ownership checks, and the authentication repairs.

The new route tests call the actual tRPC routers, middleware, mission engine, and overview code with an explicitly in-memory persistence boundary. They verify both missions produce **4/5 independent, 5/5 first try, and 1 hint** after one hinted problem; the linked parent sees separate results; unlinked and revoked parents are denied; and non-admin direct-ID linking is denied.

**Verification limits:** the MySQL migration and locking behavior were not executed against a live database; no browser session with real student and parent accounts was exercised; no production account or deployment was changed. Passing a build is not evidence that `mathfuel.org` is serving this version.

## Next release gate

Use a disposable database or identified staging environment to apply the reviewed migration, register a learner and parent, link with an invite code, complete both missions across reloads, verify the parent's saved result, then revoke the link and verify denial. Exercise two-tab saves and a repeated completion request against MySQL. Verify the deployment source and runtime configuration before considering a production release.
