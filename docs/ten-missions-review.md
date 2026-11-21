# Ten missions: review build

## What this change delivers

Students can open **Make Ten** and **Bridge Through Ten** from their dashboard or `/missions`. Both missions contain five problems. Make Ten asks for the missing part of ten; Bridge Through Ten breaks each addition problem into making ten, finding the remainder, and adding that remainder to ten.

Every answer, opened hint, and step transition is written through an authenticated tRPC mutation. A run resumes at its saved step, including a solved step awaiting Next. The server computes correctness and result totals. A unique active-run key, transaction row lock, revision check, and action ID protect against duplicate starts, concurrent tabs, and retries after an uncertain response.

The linked parent's dashboard has a separate mission flight log for both missions. It shows completed results, refreshes on focus and every 30 seconds while active, and has an explicit refresh button. The server checks the parent role and current link on every mission-progress request. A failed refresh hides cached child results.

Legacy practice statistics are unchanged. Mission results live in `missionRuns` and appear in the new mission cards; they are not silently combined with the older practice-session/mastery model.

## Discovery workshop

The workshop uses a two-part learning puzzle to introduce curious learners, parents and teachers to the database behind MathFuel. It is public educational content: a guest can open the lesson by supplying the numeric answer `4` and the word `DATA` (case and surrounding spaces are normalized). The puzzle is a discovery interaction, not authentication or a protection for private records.

`discoveryWorkshop.getTutorial` validates those clues and returns an authored lesson with explicitly fictional, captured lab examples. Extra input, including a SQL statement, is rejected. Revealing an example displays the captured rows; the lesson resolver does not execute SQL, fetch learner results, or change permissions. The shared request context retains normal session authentication, including its existing current-user lookup and sign-in timestamp update for signed-in visitors. The lesson payload is supplied by the server, while existing learner/parent authorization continues to protect actual accounts and saved mission results.

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

`drizzle/0004_ten_mission_runs.sql` adds `missionRuns`; the matching generated snapshot and journal entry are included. The five migrations in `drizzle/meta/_journal.json` were applied successfully to two isolated local databases on Oracle MySQL 8.4.13: `mathfuel_test_airport` and `mathfuel_dev_airport`. No database migration was applied to a production or staging database in this work.

Review the actual database schema and existing Drizzle journal before applying migrations. This repository contains older SQL files outside the current five-entry journal; do not glob or execute all numbered SQL files. The active journal creates 23 tables. On a disposable development database, use the project's installed Drizzle migrator after review:

```sh
node_modules/.bin/drizzle-kit migrate
```

The existing application still requires `DATABASE_URL`, `JWT_SECRET`, and a nonempty `VITE_APP_ID`. Configure `PUBLIC_APP_URL` to the intended app origin when testing password recovery outside `mathfuel.org`. Supply the appropriate existing email configuration only when an authorized email test is intended.

## Verification performed

- The complete Vitest suite passed: **196 tests across 13 files**.
- TypeScript `npm run check` passed for both the application and MySQL script configurations.
- The client and server `npm run build` passed. Existing analytics-placeholder warnings remain when the optional analytics environment values are unset.
- The generated migration creates only the new mission table.
- An independent frontend/backend source review covered the mission state machine, save/retry behavior, role and ownership checks, and the authentication repairs.

The original route tests call the actual tRPC routers, middleware, mission engine, and overview code with an explicitly in-memory persistence boundary. They verify both missions produce **4/5 independent, 5/5 first try, and 1 hint** after one hinted problem; the linked parent sees separate results; unlinked and revoked parents are denied; and non-admin direct-ID linking is denied.

The discovery resolver has 14 focused tests covering guest access, all account types, clue normalization, wrong/missing clues and rejection of extra SQL input. A real HTTP check at `2026-11-21T14:00:45.103Z` returned all ten lessons and nine SQL examples for a guest with correct clues, rejected wrong/missing/extra input, verified the no-store header, and confirmed that an anonymous mission read remained unauthorized. The `/workshop` route served the application shell. All nine captured SQL examples matched the actual development database, verified at `2026-11-21T13:57:50.372Z`. The optional T-shirt shop lesson is explicitly an invented classroom extension, separate from those database examples.

### Live MySQL verification

On **21 November 2026**, `scripts/verify-missions-mysql.ts` passed **all 12 checks** against the real Oracle MySQL 8.4.13 server in `mathfuel_test_airport`. The harness uses the application tRPC routes, password registration/login, JWT verification, database user lookup, Drizzle store and real MySQL transactions. Its workers are separate authenticated Node processes with distinct MySQL connections; persistence is not mocked.

The checks establish that:

- The selected database is the explicitly named local database; required tables use InnoDB; the five applied migration hashes and timestamps exactly match the source journal.
- Registration and password login work, invite redemption saves the parent relationship, an unrelated parent cannot read results or link directly, and a parent cannot mutate a learner mission.
- Concurrent mission starts return one active run. Invalid actions leave the saved state unchanged, and another learner cannot read or change the run.
- A saved hint survives a separate SQL connection and a newly authenticated Node process. Concurrent retries with the same action ID record the hint only once.
- Two competing updates queued behind an actual InnoDB row lock permit exactly one revision update and reject the stale writer with `CONFLICT`.
- Both missions complete with durable **4/5 independent, 5/5 first try, and 1 hint** results. Repeating the completion action returns exactly the stored response, including its timestamp.
- Every application connection uses UTC while the server remains on its original CST default. Saved timestamps match raw SQL epochs, the real completion interval and fresh application reads, with creation preceding completion.
- A newly authenticated linked parent sees both saved results. Removing the relationship denies subsequent reads, including reads using existing parent sessions.

The successful report was written to `tmp/mysql-verification-report.json`, finishing at `2026-11-21T13:51:38.575Z`. All four uniquely named test accounts and their related test data were removed after verification. The cleanup selects the exact fixture accounts created by that invocation; it does not truncate tables or drop a database.

The first real database run exposed a timestamp precision mismatch that the in-memory tests could not detect: MySQL stores the existing `TIMESTAMP` column at whole-second precision, while the initial completion response used the application's millisecond timestamp. The store now rereads the completed row inside the same transaction and returns the persisted value. A focused regression test covers that boundary; it and the nine local-database guard tests passed. The original migration history was unchanged.

Exporting the actual SQL timestamp epochs then exposed a separate six-hour offset on the server's default CST sessions: Drizzle writes UTC date strings, while MySQL interpreted those strings in its local time zone. The application now initializes every new physical pool connection to `+00:00` before application queries can use it, and configures the driver for UTC dates. A failed session initialization rejects acquisition and destroys the connection. Two focused connection-acquisition tests passed, including the initialization-failure path. The live harness passed with the server still on CST and compared actual SQL epochs against the real completion interval and fresh application reads, so two matching but incorrectly interpreted strings cannot conceal this error. The export rejects completion times in the future or before creation.

### Real HTTP teaching example

`scripts/create-mysql-lab-demo.ts` also exercised the running local Express application over HTTP with separate learner and parent cookie sessions in `mathfuel_dev_airport`. Actual registration, password login, `auth.me`, invite linking, per-step reloads, both completions and the parent's saved results passed. The fictional teaching learner has these stored results:

| Mission | Independent | First try | Hints opened | Incorrect answers |
| --- | --- | --- | --- | --- |
| Make Ten | 4/5 | 5/5 | 1 | 0 |
| Bridge Through Ten | 4/5 | 4/5 | 0 | 1 |

A third Make Ten run remains in progress and resumes with its saved hint; it has no completion summary. These are separate teaching records, not the cleaned-up automated-test fixtures. After the UTC fix, the fictional teaching example was recreated through the app. The report is `tmp/mysql-lab-http-report.json`, verified at `2026-11-21T13:51:44.482Z`.

The read-only `scripts/export-mysql-lab.ts` exports only two explicitly identified fictional teaching accounts, their relationship and that learner's mission metadata and server-computed summaries. It checks the account roles and the exact synthetic-email naming pattern inside SQL, and excludes email, authentication fields, tokens and raw mission state from its output.

**Verification limits:** the automated live harness covers backend routes and database behavior, and the HTTP example covers the real Express/tRPC/cookie transport. These checks do not establish that a browser rendered or interacted with the learner and parent screens. No production account, main branch or deployment was changed. The clean schema does not enforce a unique parent/student link pair or foreign keys; those broader integrity constraints remain a separate schema decision. Passing these checks is not evidence that `mathfuel.org` is serving this version.

## Next release gate

Complete browser interaction checks against the local app or an identified staging environment, including learner refresh/resume, the linked parent's visible results and hiding cached results after access is revoked. The backend/MySQL checks above are now executable with `npm run test:mysql` after loading a matching local database configuration and setting `MATHFUEL_TEST_DATABASE_NAME`. The harness refuses production mode, non-loopback hosts, URL query overrides and mismatched database names. Before applying the UTC connection fix to an existing deployment, inspect its historical session time zone and timestamp data: this change does not rewrite previously stored times. Verify the deployment source and runtime configuration before considering a production release.
