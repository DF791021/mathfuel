import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql, { type Connection } from "mysql2/promise";
import { readMigrationFiles } from "drizzle-orm/migrator";
import type { Pool, RowDataPacket } from "mysql2";
import type { Request, Response } from "express";
import type { AppRouter } from "../server/routers";
import type { MissionAction, MissionId, MissionOverview, MissionView } from "../shared/missions";
import type { MissionState } from "../server/missions/engine";
import { describeFailure, requireDisposableMySql } from "./mysql-verification/guard";

const target = requireDisposableMySql();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workerPath = path.join(root, "scripts/mysql-verification/worker.ts");
const reportPath = path.resolve(process.env.MATHFUEL_MYSQL_REPORT_PATH || path.join(root, "tmp/mysql-verification-report.json"));
const runToken = randomUUID();
const fixtureEmails: string[] = [];
const workers: DatabaseWorker[] = [];
let control: Connection | undefined;
let lock: Connection | undefined;
let applicationPool: Pool | undefined;
let locked = false;
let currentCheck = "database preflight";

const report: Record<string, unknown> & { checks: Array<{ name: string; passed: boolean; details?: unknown }> } = {
  startedAt: new Date().toISOString(), database: target.databaseName,
  databaseHost: target.host, databasePort: target.port,
  harness: "Actual tRPC routes, JWT authentication, application MySQL pool and fresh Node processes; no mocked persistence.",
  checks: [],
};
const pass = (name: string, details?: unknown) => {
  report.checks.push({ name, passed: true, ...(details === undefined ? {} : { details }) });
  process.stdout.write(`PASS ${name}\n`);
};

type WorkerCommand = { operation: "start" | "get" | "act" | "parentProgress" | "close"; missionId?: MissionId; runId?: string; action?: MissionAction; childId?: number };
class DatabaseWorker {
  process: ChildProcessWithoutNullStreams;
  connectionId = 0;
  private sequence = 0;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>();
  private readyResolve!: () => void;
  private readyReject!: (error: Error) => void;
  private failure: Error | null = null;
  private hasExited = false;
  ready: Promise<void>;
  exited: Promise<void>;
  constructor(cookie: string, expectedUserId: number) {
    this.ready = new Promise((resolve, reject) => { this.readyResolve = resolve; this.readyReject = reject; });
    this.process = spawn(process.execPath, ["--import", "tsx", workerPath], { cwd: root, env: process.env, stdio: ["pipe", "pipe", "pipe"] });
    const readyTimer = setTimeout(() => this.fail(new Error("MySQL worker did not become ready in 30 seconds.")), 30_000);
    const output = createInterface({ input: this.process.stdout });
    output.on("line", line => {
      if (!line.startsWith("MYSQL_VERIFY:")) return; // Ignore ordinary application initialization logs.
      const message = JSON.parse(line.slice("MYSQL_VERIFY:".length));
      if (message.event === "ready") {
        clearTimeout(readyTimer); this.connectionId = message.connectionId; this.readyResolve();
      } else if (message.event === "fatal") {
        clearTimeout(readyTimer); this.fail(Object.assign(new Error(message.error.message), { code: message.error.code }));
      } else if (message.event === "result") {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        clearTimeout(pending.timer); this.pending.delete(message.id);
        if (message.ok) pending.resolve(message.value);
        else pending.reject(Object.assign(new Error(message.error.message), { code: message.error.code }));
      }
    });
    // Drain stderr, but do not echo driver parameters or authentication data.
    this.process.stderr.resume();
    this.process.stdin.on("error", error => this.fail(error));
    this.process.on("error", error => { clearTimeout(readyTimer); this.fail(error); });
    this.exited = new Promise(resolve => this.process.once("close", code => {
      clearTimeout(readyTimer);
      this.hasExited = true;
      if (code !== 0 || this.pending.size) this.fail(new Error(`MySQL worker exited before its request finished (code ${code}).`));
      resolve();
    }));
    this.process.stdin.write(`${JSON.stringify({ cookie, expectedUserId })}\n`);
  }
  private fail(error: Error) {
    this.failure ??= error;
    this.readyReject(error);
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
    this.pending.clear();
  }
  async call<T>(command: WorkerCommand): Promise<T> {
    if (this.failure) throw this.failure;
    if (this.hasExited || this.process.stdin.destroyed) throw new Error("MySQL worker is already closed.");
    await this.ready;
    if (this.failure) throw this.failure;
    if (this.hasExited || this.process.stdin.destroyed) throw new Error("MySQL worker is already closed.");
    const id = ++this.sequence;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error("MySQL worker request timed out after 30 seconds.")); }, 30_000);
      this.pending.set(id, { resolve, reject, timer });
      this.process.stdin.write(`${JSON.stringify({ ...command, id })}\n`, error => { if (error) this.fail(error); });
    });
  }
  async close() {
    if (this.hasExited || this.process.exitCode !== null) return;
    // Wait for actual process/pipe closure before fixture deletion. Force-close
    // an unresponsive worker independently of the normal RPC timeout.
    const killTimer = setTimeout(() => this.process.kill("SIGKILL"), 2000);
    if (this.failure) this.process.kill("SIGTERM");
    else void this.call({ operation: "close" }).then(() => this.process.stdin.end()).catch(() => this.process.kill("SIGTERM"));
    await this.exited;
    clearTimeout(killTimer);
  }
}

type Caller = ReturnType<AppRouter["createCaller"]>;
type Actor = { id: number; cookie: string; caller: Caller };
function request(cookie?: string) {
  return { protocol: "https", headers: { ...(cookie ? { cookie } : {}) } } as Request;
}
function answerFor(view: MissionView) {
  const q = view.question!;
  return String(q.kind === "make-ten" || q.kind === "bridge-gap" ? 10 - q.a : q.kind === "bridge-rest" ? q.b - (10 - q.a) : q.a + q.b);
}
function actionFor(view: MissionView, action: MissionAction["action"], answer?: string): MissionAction {
  return { runId: view.id, expectedRevision: view.revision, actionId: randomUUID(), action, ...(answer === undefined ? {} : { answer }) };
}
async function denied(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, error => (error as { code?: string }).code === code, `Expected ${code}.`);
}
async function readRun(runId: string) {
  interface MissionRow extends RowDataPacket {
    id: string; studentId: number; missionId: MissionId; revision: number;
    status: "in_progress" | "completed"; activeKey: string | null;
    state: MissionState | string; completedAt: Date | null;
    createdAtEpoch: number | string; completedAtEpoch: number | string | null;
  }
  const [rows] = await control!.execute<MissionRow[]>("SELECT id, studentId, missionId, revision, status, activeKey, state, completedAt, UNIX_TIMESTAMP(createdAt) AS createdAtEpoch, UNIX_TIMESTAMP(completedAt) AS completedAtEpoch FROM missionRuns WHERE id = ?", [runId]);
  assert.equal(rows.length, 1, "Expected exactly one durable mission row.");
  const row = rows[0];
  return { ...row, state: typeof row.state === "string" ? JSON.parse(row.state) : row.state };
}
async function workerFor(actor: Actor) {
  const worker = new DatabaseWorker(actor.cookie, actor.id);
  workers.push(worker); await worker.ready;
  return worker;
}
async function finish(actor: Actor, view: MissionView) {
  let completionAction: MissionAction | null = null;
  let completionStartedAt = 0;
  while (view.status !== "completed") {
    if (!view.question!.solved) view = await actor.caller.mission.act(actionFor(view, "answer", answerFor(view)));
    completionAction = actionFor(view, "next");
    completionStartedAt = Date.now();
    view = await actor.caller.mission.act(completionAction);
  }
  assert(completionAction, "A completion action was expected.");
  return { view, completionAction, completionStartedAt, completionFinishedAt: Date.now() };
}

try {
  control = await mysql.createConnection(target.connectionString);
  const [server] = await control.query<RowDataPacket[]>("SELECT DATABASE() AS databaseName, @@version AS version, @@version_comment AS versionComment, CONNECTION_ID() AS connectionId, @@session.time_zone AS controlSessionTimeZone, @@system_time_zone AS systemTimeZone");
  assert.equal(server[0].databaseName, target.databaseName, "Connected database differs from the guarded name.");
  assert(!/mariadb/i.test(`${server[0].version} ${server[0].versionComment}`), "This verification requires MySQL, not MariaDB.");
  report.server = server[0];
  const [tables] = await control.execute<RowDataPacket[]>("SELECT TABLE_NAME AS name, ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('users','missionRuns','inviteCodes','parentStudentLinks','passwordResetTokens')", [target.databaseName]);
  assert.equal(tables.length, 5, "Apply the current Drizzle journal before running verification.");
  assert(tables.every(table => table.engine === "InnoDB"), "All verification tables must use InnoDB transactions.");
  const [migrations] = await control.query<RowDataPacket[]>("SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at");
  const expectedMigrations = readMigrationFiles({ migrationsFolder: path.join(root, "drizzle") });
  assert.equal(expectedMigrations.length, 5, "This verification expects the reviewed five-migration source journal.");
  assert.deepEqual(migrations.map(row => ({ hash: row.hash, timestamp: Number(row.created_at) })),
    expectedMigrations.map(migration => ({ hash: migration.hash, timestamp: migration.folderMillis })),
    "The database migration hashes/timestamps do not match the reviewed source journal.");
  report.migrations = migrations;
  pass("real MySQL and the five reviewed migrations are present", { tables });

  const [{ appRouter }, { createContext }, { getDb }, { COOKIE_NAME }] = await Promise.all([
    import("../server/routers"), import("../server/_core/context"), import("../server/db"), import("../shared/const"),
  ]);
  const database = await getDb();
  assert(database);
  applicationPool = (database as unknown as { $client: Pool }).$client;
  const [appSession] = await applicationPool.promise().query<RowDataPacket[]>("SELECT @@session.time_zone AS sessionTimeZone");
  assert.equal(appSession[0].sessionTimeZone, "+00:00", "The application pool must initialize every new MySQL session to UTC.");
  report.applicationSessionTimeZone = appSession[0].sessionTimeZone;

  async function actor(label: string, userType: "student" | "parent"): Promise<Actor> {
    const email = `mysql-${runToken}-${label}@example.test`;
    fixtureEmails.push(email);
    const password = randomBytes(24).toString("base64url");
    let cookie = "";
    const res = { cookie(name: string, value: string) { cookie = `${name}=${value}`; }, clearCookie() {} } as unknown as Response;
    const anonymous = appRouter.createCaller({ req: request(), res, user: null });
    const registered = await anonymous.auth.register({ email, password, name: `MySQL verification ${label}`, userType, ...(userType === "student" ? { gradeLevel: 1 } : {}) });
    assert(registered.user?.id);
    assert(!("passwordHash" in registered.user), "Registration leaked a password hash.");
    cookie = "";
    const loggedIn = await anonymous.auth.login({ email, password });
    assert(loggedIn.success && cookie.startsWith(`${COOKIE_NAME}=`), "Real login did not issue a session cookie.");
    const context = await createContext({ req: request(cookie), res, info: {} as never });
    assert.equal(context.user?.id, registered.user.id, "JWT authentication did not load the registered account.");
    return { id: registered.user.id, cookie, caller: appRouter.createCaller(context) };
  }

  currentCheck = "register and authenticate isolated fixtures";
  const learner = await actor("learner", "student");
  const otherLearner = await actor("other-learner", "student");
  const parent = await actor("parent", "parent");
  const unrelatedParent = await actor("other-parent", "parent");
  report.fixtureUserIds = { learner: learner.id, otherLearner: otherLearner.id, parent: parent.id, unrelatedParent: unrelatedParent.id };
  pass("real registration, password login and JWT/database authentication");

  currentCheck = "link a parent through the actual invite workflow";
  const invite = await learner.caller.parent.generateInviteCode();
  const linkResult = await parent.caller.parent.redeemInviteCode({ code: invite.code });
  assert.equal(linkResult.studentId, learner.id);
  const [links] = await control.execute<RowDataPacket[]>("SELECT parentId, studentId FROM parentStudentLinks WHERE parentId = ? AND studentId = ?", [parent.id, learner.id]);
  assert.equal(links.length, 1);
  await denied(unrelatedParent.caller.parent.getMissionProgress({ childId: learner.id }), "FORBIDDEN");
  await denied(unrelatedParent.caller.parent.linkChild({ childId: learner.id }), "FORBIDDEN");
  await denied(parent.caller.mission.start({ missionId: "make-ten" }), "FORBIDDEN");
  pass("invite linking persists and unrelated parents cannot read or self-link");

  const workerA = await workerFor(learner);
  const workerB = await workerFor(learner);
  assert.notEqual(workerA.connectionId, workerB.connectionId, "Concurrency verification needs separate MySQL connections.");
  report.workerConnectionIds = [workerA.connectionId, workerB.connectionId];

  currentCheck = "concurrent duplicate starts";
  const starts = await Promise.all([workerA.call<MissionView>({ operation: "start", missionId: "make-ten" }), workerB.call<MissionView>({ operation: "start", missionId: "make-ten" })]);
  assert.equal(starts[0].id, starts[1].id);
  let makeTen = starts[0];
  const [activeRows] = await control.execute<RowDataPacket[]>("SELECT COUNT(*) AS total FROM missionRuns WHERE studentId = ? AND missionId = 'make-ten' AND status = 'in_progress'", [learner.id]);
  assert.equal(Number(activeRows[0].total), 1);
  pass("concurrent starts on separate connections return one active run");

  currentCheck = "rollback and learner ownership";
  await denied(learner.caller.mission.act(actionFor(makeTen, "answer", "2x")), "BAD_REQUEST");
  await denied(learner.caller.mission.act(actionFor(makeTen, "next")), "BAD_REQUEST");
  await denied(otherLearner.caller.mission.getRun({ runId: makeTen.id }), "NOT_FOUND");
  await denied(otherLearner.caller.mission.act(actionFor(makeTen, "hint")), "NOT_FOUND");
  const unchanged = await readRun(makeTen.id);
  assert.equal(unchanged.revision, 0);
  assert.equal(unchanged.state.actions.length, 0);
  pass("invalid actions roll back and another learner cannot read or write the run");

  currentCheck = "persisted hint survives independent database reads and a fresh process";
  const hintAction = actionFor(makeTen, "hint");
  makeTen = await learner.caller.mission.act(hintAction);
  const durableHint = await readRun(makeTen.id);
  assert.equal(durableHint.revision, makeTen.revision);
  assert.equal(durableHint.state.problems[0].steps[0].hintsUsed, 1);
  const reloadWorker = await workerFor(learner);
  assert(![workerA.connectionId, workerB.connectionId].includes(reloadWorker.connectionId));
  const reloaded = await reloadWorker.call<MissionView>({ operation: "get", runId: makeTen.id });
  assert.deepEqual(reloaded, makeTen);
  await reloadWorker.close();
  pass("per-step state survives a separate SQL connection and fresh authenticated Node process", { reloadConnectionId: reloadWorker.connectionId });

  currentCheck = "concurrent retry idempotency";
  const retries = await Promise.all([workerA.call<MissionView>({ operation: "act", action: hintAction }), workerB.call<MissionView>({ operation: "act", action: hintAction })]);
  assert(retries.every(view => view.revision === 1 && view.question?.hintsUsed === 1));
  assert.equal((await readRun(makeTen.id)).state.actions.length, 1);
  pass("concurrent retries of one action do not duplicate hints or evidence");

  currentCheck = "concurrent conflicting updates serialize behind an actual InnoDB lock";
  lock = await mysql.createConnection(target.connectionString);
  await lock.beginTransaction(); locked = true;
  await lock.execute("SELECT id FROM missionRuns WHERE id = ? FOR UPDATE", [makeTen.id]);
  const candidates = [actionFor(makeTen, "answer", answerFor(makeTen)), actionFor(makeTen, "answer", answerFor(makeTen))];
  const contenderA = workerA.call<MissionView>({ operation: "act", action: candidates[0] });
  const contenderB = workerB.call<MissionView>({ operation: "act", action: candidates[1] });
  const settledContenders = Promise.allSettled([contenderA, contenderB]);
  const deadline = Date.now() + 10_000;
  let bothWaiting = false;
  while (Date.now() < deadline) {
    const [processes] = await control.query<RowDataPacket[]>("SHOW FULL PROCESSLIST");
    bothWaiting = [workerA.connectionId, workerB.connectionId].every(id => processes.some(row => Number(row.Id) === id && /missionRuns/i.test(String(row.Info || ""))));
    if (bothWaiting) break;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  assert(bothWaiting, "Both worker connections must reach the locked mission row before the lock is released.");
  await lock.commit(); locked = false;
  const outcomes = await settledContenders;
  const winners = outcomes.filter(outcome => outcome.status === "fulfilled");
  const losers = outcomes.filter(outcome => outcome.status === "rejected");
  assert.equal(winners.length, 1, "Exactly one write with a given revision may commit.");
  assert.equal(losers.length, 1);
  assert.equal(losers[0].status === "rejected" && losers[0].reason.code, "CONFLICT");
  makeTen = (winners[0] as PromiseFulfilledResult<MissionView>).value;
  assert.equal(makeTen.revision, 2);
  assert.equal((await readRun(makeTen.id)).state.actions.length, 2);
  pass("row locking permits one concurrent revision and rejects the stale writer", { connections: [workerA.connectionId, workerB.connectionId] });

  currentCheck = "complete and reload both missions";
  const completedTen = await finish(learner, makeTen);
  assert.deepEqual({ independent: completedTen.view.summary?.independent, firstTry: completedTen.view.summary?.firstTry, hints: completedTen.view.summary?.hintsUsed }, { independent: 4, firstTry: 5, hints: 1 });
  const completionRetry = await workerA.call<MissionView>({ operation: "act", action: completedTen.completionAction });
  assert.deepEqual(completionRetry, completedTen.view, "A completion response must match its durable retry, including timestamps.");
  const savedTen = await readRun(completedTen.view.id);
  assert.equal(savedTen.activeKey, null);
  assert.equal(savedTen.status, "completed");

  let bridge = await learner.caller.mission.start({ missionId: "bridge-ten" });
  bridge = await learner.caller.mission.act(actionFor(bridge, "hint"));
  const completedBridge = await finish(learner, bridge);
  assert.deepEqual({ independent: completedBridge.view.summary?.independent, firstTry: completedBridge.view.summary?.firstTry, hints: completedBridge.view.summary?.hintsUsed }, { independent: 4, firstTry: 5, hints: 1 });
  const savedBridge = await readRun(completedBridge.view.id);
  assert.equal(savedBridge.state.problems.flatMap((problem: { steps: unknown[] }) => problem.steps).length, 15);
  assert.equal(savedBridge.activeKey, null);
  report.missionResults = [completedTen.view.summary, completedBridge.view.summary];
  pass("both completed missions have durable, honest results; completion retries are idempotent", { makeTenRunId: completedTen.view.id, bridgeRunId: completedBridge.view.id });

  currentCheck = "UTC completion timestamps match actual SQL epochs and real elapsed time";
  const { getMissionRun } = await import("../server/missions/store");
  const timestampEvidence = [];
  for (const [completed, saved] of [[completedTen, savedTen], [completedBridge, savedBridge]] as const) {
    assert(saved.completedAtEpoch !== null);
    const createdMs = Number(saved.createdAtEpoch) * 1000;
    const completedMs = Number(saved.completedAtEpoch) * 1000;
    assert.equal(Date.parse(completed.view.summary!.completedAt), completedMs,
      "The response must match MySQL's actual timestamp epoch, not only a repeated wall-clock string.");
    assert(completedMs >= completed.completionStartedAt - 2000 && completedMs <= completed.completionFinishedAt + 2000,
      "The saved completion must fall within the actual action interval (2-second clock/precision tolerance).");
    assert(createdMs >= Date.parse(String(report.startedAt)) - 2000 && createdMs <= completedMs,
      "The saved creation must belong to this run and precede completion.");
    const fresh = await getMissionRun(learner.id, completed.view.id);
    assert.equal(fresh.createdAt.getTime(), createdMs, "Application and raw SQL must agree on creation time.");
    assert.equal(fresh.completedAt?.getTime(), completedMs, "Application and raw SQL must agree on completion time.");
    timestampEvidence.push({ runId: completed.view.id, createdAt: fresh.createdAt.toISOString(), completedAt: fresh.completedAt!.toISOString() });
  }
  pass("UTC timestamps match raw MySQL epochs and the real completion interval", { timestamps: timestampEvidence });

  currentCheck = "parent reads both persisted mission results from a fresh process";
  const parentWorker = await workerFor(parent);
  const progress = await parentWorker.call<MissionOverview>({ operation: "parentProgress", childId: learner.id });
  for (const expected of [completedTen.view.summary!, completedBridge.view.summary!]) {
    assert.deepEqual(progress.missions.find(mission => mission.id === expected.missionId)?.latest, expected);
  }
  pass("a real linked parent sees both saved results after fresh-process authentication");

  currentCheck = "revocation removes access even for an existing authenticated parent session";
  await parent.caller.parent.unlinkChild({ childId: learner.id });
  await denied(parent.caller.parent.getMissionProgress({ childId: learner.id }), "FORBIDDEN");
  await denied(parentWorker.call({ operation: "parentProgress", childId: learner.id }), "FORBIDDEN");
  const [revokedLinks] = await control.execute<RowDataPacket[]>("SELECT id FROM parentStudentLinks WHERE parentId = ? AND studentId = ?", [parent.id, learner.id]);
  assert.equal(revokedLinks.length, 0);
  pass("unlinking removes the database relationship and denies existing parent sessions");
  report.passed = true;
} catch (error) {
  report.passed = false;
  const failure = describeFailure(error);
  report.checks.push({ name: currentCheck, passed: false, details: failure });
  process.stderr.write(`FAIL ${currentCheck}: ${failure.code}: ${failure.message}\n`);
  process.exitCode = 1;
} finally {
  if (locked && lock) await lock.rollback().catch(() => undefined);
  await Promise.allSettled(workers.map(worker => worker.close()));
  if (lock) await lock.end();
  if (control) {
    try {
      if (fixtureEmails.length && process.env.MATHFUEL_TEST_KEEP_FIXTURES !== "1") {
        const marks = fixtureEmails.map(() => "?").join(",");
        const [fixtures] = await control.execute<RowDataPacket[]>(`SELECT id FROM users WHERE email IN (${marks})`, fixtureEmails);
        const ids = fixtures.map(row => Number(row.id));
        if (ids.length) {
          const idMarks = ids.map(() => "?").join(",");
          await control.beginTransaction();
          await control.execute(`DELETE FROM missionRuns WHERE studentId IN (${idMarks})`, ids);
          await control.execute(`DELETE FROM inviteCodes WHERE studentId IN (${idMarks}) OR usedBy IN (${idMarks})`, [...ids, ...ids]);
          await control.execute(`DELETE FROM parentStudentLinks WHERE parentId IN (${idMarks}) OR studentId IN (${idMarks})`, [...ids, ...ids]);
          await control.execute(`DELETE FROM passwordResetTokens WHERE userId IN (${idMarks})`, ids);
          await control.execute(`DELETE FROM users WHERE id IN (${idMarks}) AND email IN (${marks})`, [...ids, ...fixtureEmails]);
          await control.commit();
        }
        report.cleanup = { keptFixtures: false, deletedFixtureUsers: ids.length };
      } else report.cleanup = { keptFixtures: process.env.MATHFUEL_TEST_KEEP_FIXTURES === "1", deletedFixtureUsers: 0 };
    } catch (error) {
      await control.rollback().catch(() => undefined);
      report.cleanup = { error: describeFailure(error) }; report.passed = false; process.exitCode = 1;
    }
    await control.end();
  }
  if (applicationPool) await applicationPool.promise().end();
  report.finishedAt = new Date().toISOString();
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`Report: ${reportPath}\n`);
}
