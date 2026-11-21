# MathFuel: a first MySQL and Excel lab

**Goal:** run MathFuel locally, inspect a learner's saved missions with SQL, and bring a small report into Excel.

The authoring lab uses **Oracle MySQL 8.4.13 at `127.0.0.1:3307`**, with `mathfuel_dev_airport` and a separate `mathfuel_test_airport` database. All five current migrations succeeded on both databases. This is a development environment; it does not establish a deployment to MathFuel.org or an installation on your Windows computer.

### Verified in the authoring lab on November 21, 2026

**All 12 live MySQL checks passed:** registration, password login, JWT authentication, invite linking, persistence across fresh processes, concurrent starts and retries, row locking, completed-run reloads, parent reads, and denial after unlinking. Testing found both timestamp precision and session-timezone mismatches. Completion responses now use the row read back from MySQL, and each application connection uses UTC. The final checks compared raw SQL epochs with the real action interval while the server retained its CST system zone.

An additional test made real HTTP requests through Express. Dummy learner **63** and parent **67** produced two completed runs and one resumable run:

| Completed mission | Independent | First try | Hints | Wrong answers |
| --- | ---: | ---: | ---: | ---: |
| Make Ten | 4/5 | 5/5 | 1 | 0 |
| Bridge Through Ten | 4/5 | 4/5 | 0 | 1 |

Evidence: generated lab reports `tmp/mysql-verification-report.json` and `tmp/mysql-lab-http-report.json`. These are temporary test outputs, not committed fixtures. **A real browser UI walkthrough and an Excel connection were not tested.** The Windows installation and Excel procedures below are reproduction instructions.

## 1. Understand the pieces

| Piece | What it does | Which account it uses |
| --- | --- | --- |
| MySQL server | Stores tables and executes SQL | A MySQL username and password |
| MathFuel application | Registers learners, checks permissions, and saves mission actions | A MathFuel account; its server separately uses a MySQL service account |
| Drizzle migrations | Build or change the database structure from reviewed SQL | A separate MySQL migration account |
| Excel | Reads exported data or imports query results for analysis | Microsoft sign-in for Microsoft services; MySQL credentials for a database connection |

Your Microsoft/OneDrive login does not create a MySQL account. Here, `127.0.0.1` means the computer running the client: on your Windows PC it means your PC, not the authoring lab. A database is a collection of tables; a table has rows (records) and columns (fields).

### The three tables to learn first

| Table | One row means | Key fields |
| --- | --- | --- |
| `users` | One account | `id`, `name`, `userType`, `gradeLevel` |
| `parentStudentLinks` | One recorded parent/learner link | `id`, `parentId`, `studentId`, `relationship` |
| `missionRuns` | One attempt at a mission | `id`, `studentId`, `missionId`, `status`, `revision`, `state`, `completedAt` |

`parentId` and `studentId` identify rows in `users`. These are relationships implemented by the application: the current schema declares **no database foreign keys**. A column named `studentId` alone does not make MySQL reject a nonexistent student. A declared foreign key would add database enforcement. See [MySQL's foreign-key explanation](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html).

`missionRuns.activeKey` does have a unique constraint. The application uses a value such as `42:make-ten` for an active run and clears it on completion. The saved `state` is JSON containing problems and step progress. Parent-link pairs currently have no unique constraint in the journaled schema; an older repair script adding one is not part of the migration chain.

## 2. Reproduce the lab on Windows

### Install the tools

Use **MySQL 8.4 LTS**, **Node.js 22.12 or later**, and **pnpm 10**. For Windows, Oracle's MySQL 8.4 MSI includes MySQL Configurator; use it to configure a local server and remember the administrator password. This guide uses port **3307**. If you choose the usual 3306 instead, change every connection below consistently. See [Oracle's Windows package instructions](https://dev.mysql.com/doc/refman/8.4/en/windows-choosing-package.html).

Install Node from [nodejs.org](https://nodejs.org/en/download), then open PowerShell:

```powershell
npm install --global pnpm@10
node --version
pnpm --version
mysql --version
```

If `mysql` is not on PATH, run its full path, normally:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" --version
```

In the remaining commands, use that full executable path if needed. Open PowerShell in your MathFuel project folder, then run `pnpm install --frozen-lockfile`. This is a native installation path; no Docker recipe was tested for this lab.

### Create two databases and separate accounts

The names ending in `_local` below are **example names for your computer**. They differ deliberately from the authoring lab's `_airport` names.

Connect as the local MySQL administrator. `--password` prompts for the password:

```powershell
mysql --protocol=TCP --host=127.0.0.1 --port=3307 --user=root --password
```

Run the following SQL **once on your new local server**. Replace every `REPLACE_...` password with a different local password before executing. These are placeholders, not working credentials. Keep real passwords out of committed SQL and source files.

```sql
CREATE DATABASE mathfuel_dev_local
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE mathfuel_test_local
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE USER 'mathfuel_app'@'127.0.0.1'
  IDENTIFIED BY 'REPLACE_APP_PASSWORD';
CREATE USER 'mathfuel_test_app'@'127.0.0.1'
  IDENTIFIED BY 'REPLACE_TEST_PASSWORD';
CREATE USER 'mathfuel_migrate'@'127.0.0.1'
  IDENTIFIED BY 'REPLACE_MIGRATION_PASSWORD';

GRANT SELECT, INSERT, UPDATE, DELETE
  ON `mathfuel\_dev\_local`.* TO 'mathfuel_app'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE
  ON `mathfuel\_test\_local`.* TO 'mathfuel_test_app'@'127.0.0.1';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP
  ON `mathfuel\_dev\_local`.* TO 'mathfuel_migrate'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP
  ON `mathfuel\_test\_local`.* TO 'mathfuel_migrate'@'127.0.0.1';

SHOW GRANTS FOR 'mathfuel_app'@'127.0.0.1';
SHOW GRANTS FOR 'mathfuel_migrate'@'127.0.0.1';
```

The app accounts can read and change records (DML); the migration account can change structure (DDL). The `\_` escapes make underscores literal in database-level grants. These examples follow MySQL's [account-management](https://dev.mysql.com/doc/refman/8.4/en/creating-accounts.html), [CREATE DATABASE](https://dev.mysql.com/doc/refman/8.4/en/create-database.html), and [GRANT](https://dev.mysql.com/doc/refman/8.4/en/grant.html) documentation. Type `exit` to return to PowerShell.

### Configure the app and apply migrations

```powershell
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Edit the local, Git-ignored `.env`. Set `DATABASE_URL` to the **app** account on `mathfuel_dev_local`, paste the generated random value into `JWT_SECRET`, and retain the local `VITE_APP_ID`, `PUBLIC_APP_URL`, and port values. URL-encode special characters in a password used inside a connection URL. Do not put the migration account into the app's normal configuration.

For the following commands, this PowerShell helper prompts for a password and constructs the connection URL without typing the password into command history:

```powershell
function Use-LabDatabase([string]$LabUser, [string]$LabDatabase) {
  $LabCredential = Get-Credential -UserName $LabUser -Message "Local MySQL password"
  $LabPassword = [uri]::EscapeDataString($LabCredential.GetNetworkCredential().Password)
  $env:DATABASE_URL = "mysql://${LabUser}:${LabPassword}@127.0.0.1:3307/${LabDatabase}"
}

Use-LabDatabase "mathfuel_migrate" "mathfuel_dev_local"
pnpm db:migrate
Use-LabDatabase "mathfuel_migrate" "mathfuel_test_local"
pnpm db:migrate
Remove-Item Env:DATABASE_URL
```

Check each command succeeds before continuing. Removing the temporary environment variable lets the app read its normal connection from `.env`.

**The journal controls migration order.** The reviewed chain in `drizzle/meta/_journal.json` is:

1. `0000_greedy_pepper_potts` — 19 base tables.
2. `0001_smooth_stranger` — `aiFeedback`.
3. `0002_amazing_warpath` — `users.passwordHash`.
4. `0003_cheerful_nicolaos` — `inviteCodes` and `passwordResetTokens`.
5. `0004_ten_mission_runs` — `missionRuns`.

This yields 23 application tables, plus Drizzle's migration tracking table. The 25 other SQL files are a legacy history: do not run every file in the folder. `pnpm db:generate` prepares SQL after an intentional schema change; `pnpm db:migrate` applies the journaled migrations. A new local installation needs the latter. Do not run the old `scripts/migrate-*.mjs` repair scripts as an additional initialization sequence.

### Start MathFuel

The existing `pnpm dev` script uses POSIX environment syntax. Use this equivalent in Windows PowerShell:

```powershell
$env:NODE_ENV = "development"
pnpm exec tsx watch server/_core/index.ts
```

Open the local URL printed by the server, usually `http://localhost:3000`. Create a dummy learner and a dummy parent, link them through the app's invite flow, and open `/missions`. Answer a step, reload, then complete a mission. The two missions generate their own problems; the older general practice area needs separate content seeding.

## 3. Read what the app saved

Open a second terminal and connect to the development database:

```powershell
mysql --protocol=TCP --host=127.0.0.1 --port=3307 --user=mathfuel_app --password mathfuel_dev_local
```

All exercises in this section are read-only. Empty results are expected before you create accounts or start missions.

### A. Confirm where you are

```sql
SELECT DATABASE() AS selected_database, VERSION() AS server_version;
SHOW TABLES;
DESCRIBE users;
DESCRIBE parentStudentLinks;
DESCRIBE missionRuns;
```

### B. Read accounts with SELECT

```sql
SELECT id, name, userType, gradeLevel
FROM users
ORDER BY id
LIMIT 20;
```

`SELECT` chooses columns; `FROM` chooses the table; `ORDER BY` orders the rows. Selecting named columns also keeps password hashes out of your results.

### C. Connect records with JOIN

```sql
SELECT parent.name AS parent_name,
       student.name AS student_name,
       link.relationship
FROM parentStudentLinks AS link
JOIN users AS parent ON parent.id = link.parentId
JOIN users AS student ON student.id = link.studentId
ORDER BY parent.id, student.id;
```

The query reads `users` twice because both people are accounts. `parent` and `student` are temporary names, called aliases, used inside this query.

### D. Inspect saved missions

A standalone SQL client inherits its server session time zone. Set only this session to UTC before comparing displayed dates with application timestamps. `UNIX_TIMESTAMP(completedAt)` gives the stored instant as an epoch.

```sql
SET SESSION time_zone = '+00:00';
SELECT student.name, run.missionId, run.status,
       run.revision, run.completedAt
FROM missionRuns AS run
JOIN users AS student ON student.id = run.studentId
ORDER BY run.createdAt DESC, run.id
LIMIT 20;

SELECT id, missionId,
       JSON_EXTRACT(state, '$.problemIndex') AS problem_index,
       JSON_EXTRACT(state, '$.stepIndex') AS step_index,
       JSON_LENGTH(JSON_EXTRACT(state, '$.problems')) AS problem_count
FROM missionRuns
ORDER BY createdAt DESC
LIMIT 5;
```

Repeat after an answer or a reload. The same run ID identifies the saved attempt. `revision` tracks updates; `completedAt` remains `NULL` until completion. The JSON query reads selected progress fields without displaying the entire saved state.

### E. Make a small report

```sql
SELECT missionId, status, COUNT(*) AS runCount
FROM missionRuns
GROUP BY missionId, status
ORDER BY missionId, status;
```

Each result row counts one mission/status combination. This measures saved runs, not unique learners or demonstrated mastery.

## 4. Bring the report into Excel

### Option A: a portable snapshot

Export exercise E's result from a SQL client's results grid as CSV, or use this PowerShell command to create a tab-separated file:

```powershell
New-Item -ItemType Directory -Force .\tmp | Out-Null
mysql --protocol=TCP --host=127.0.0.1 --port=3307 --user=mathfuel_app --password --database=mathfuel_dev_local --batch --execute="SELECT missionId, status, COUNT(*) AS runCount FROM missionRuns GROUP BY missionId, status ORDER BY missionId, status" | Set-Content -Encoding utf8 .\tmp\mission-summary.tsv
```

In Excel for Windows, use **Data → From Text/CSV**, choose the file, and select **Tab** as the delimiter for this TSV. Load it as a table; make a PivotTable with `missionId` as rows, `status` as columns, and the sum of `runCount` as values. Importing a file uses no database password. It is a snapshot: new mission results require a new export. See [Microsoft's import instructions](https://support.microsoft.com/en-us/excel/import-data-from-data-sources-power-query).

### Option B: a refreshable Power Query import

Availability depends on the Excel edition, build, and platform. Microsoft lists MySQL for Excel, but explicitly says that support in one Excel version does not imply support in every version. See the [connector availability guidance](https://learn.microsoft.com/en-us/power-query/connectors/).

First, after migrations, the local administrator can create a reporting account with only the table access this report needs. Replace the password placeholder:

```sql
CREATE USER 'mathfuel_excel'@'127.0.0.1'
  IDENTIFIED BY 'REPLACE_REPORTING_PASSWORD';
GRANT SELECT ON mathfuel_dev_local.missionRuns
  TO 'mathfuel_excel'@'127.0.0.1';
```

In a supported Excel for Windows build, choose **Data → Get Data → From Database → From MySQL Database**. Use server `127.0.0.1:3307`, database `mathfuel_dev_local`, and **Database** authentication with the reporting credentials. Put exercise E's query in the SQL statement option, then load its results. A refresh reruns the import; it is not a continuously live view. See [Microsoft's MySQL connector instructions](https://learn.microsoft.com/en-us/power-query/connectors/mysql-database).

Driver requirements vary by host. Microsoft's current Excel import page points missing-component errors to MySQL ODBC; its shared connector page explicitly discusses Connector/NET prerequisites for Power BI and gateways. Use the component required by your particular Excel build; this guide does not claim either driver has been installed or tested on your computer. If the connector is unavailable, use the snapshot option.

Editing the imported cells does **not** write changes back to MathFuel. Direct database access also does not run MathFuel's parent/learner authorization checks; the reporting account above can read all rows in the granted local table. Microsoft sign-in or saving the workbook to OneDrive does not change that. Excel for the web and cloud refresh have separate connectivity requirements; a saved workbook does not make your PC's loopback database reachable from the cloud.

## 5. Run the separate MySQL verification

Keep the development database for your manual examples. The automated verifier creates and cleans up fixtures in the **separate test database** and expects the five migrations to be present.

In PowerShell, using the helper from section 2:

```powershell
Use-LabDatabase "mathfuel_test_app" "mathfuel_test_local"
$env:MATHFUEL_TEST_DATABASE_NAME = "mathfuel_test_local"
$env:JWT_SECRET = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
$env:VITE_APP_ID = "mathfuel-local-lab"
$env:NODE_ENV = "test"
pnpm test:mysql
```

The command writes `tmp/mysql-verification-report.json`. Judge success by its completed results and the command's exit status, not by the existence of the file. Its guard requires an explicit matching local database name, loopback host, and development/test configuration. It exercises real application routes and persistence; it does not establish browser behavior, Excel connectivity, or production deployment.

Afterward, close that test terminal, or clear its temporary overrides before starting the app there:

```powershell
Remove-Item Env:DATABASE_URL, Env:MATHFUEL_TEST_DATABASE_NAME, Env:JWT_SECRET, Env:VITE_APP_ID, Env:NODE_ENV -ErrorAction SilentlyContinue
```

**Your first checkpoint:** explain one row in each of the three tables, show a saved mission surviving a reload, and produce the mission/status report in Excel.

### Repository references

Table definitions: `drizzle/schema.ts`. Migration order: `drizzle/meta/_journal.json`. Mission persistence: `server/missions/store.ts`. Mission state: `server/missions/engine.ts`. Verification: `scripts/verify-missions-mysql.ts` and `scripts/mysql-verification/guard.ts`.
