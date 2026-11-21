/** Read-only teaching export, restricted to two explicitly selected fictional lab accounts. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { MISSION_CONTENT_VERSION, summarizeMission, type MissionRecord, type MissionState } from "../server/missions/engine";
import { describeFailure, requireDisposableMySql } from "./mysql-verification/guard";

const target = requireDisposableMySql();
assert(target.databaseName.startsWith("mathfuel_dev_"), "Teaching exports require a local mathfuel_dev_* database.");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(root, "tmp/mysql-lab-export.json");

function actorId(variable: "MATHFUEL_LAB_LEARNER_ID" | "MATHFUEL_LAB_PARENT_ID") {
  const raw = process.env[variable];
  assert(raw && /^[1-9]\d*$/.test(raw), `Set ${variable} to the exact synthetic account ID.`);
  const id = Number(raw);
  assert(Number.isSafeInteger(id), `${variable} must be a safe positive integer.`);
  return id;
}

const learnerId = actorId("MATHFUEL_LAB_LEARNER_ID");
const parentId = actorId("MATHFUEL_LAB_PARENT_ID");
assert.notEqual(learnerId, parentId, "The learner and parent must be different synthetic accounts.");

function timestamp(epoch: number | string | null): string | null {
  if (epoch === null) return null;
  const date = new Date(Number(epoch) * 1000);
  assert(Number.isFinite(date.getTime()), "A stored timestamp was invalid.");
  return date.toISOString();
}

type UserRow = RowDataPacket & { id: number; name: string | null; userType: string; gradeLevel: number | null };
type LinkRow = RowDataPacket & { id: number; parentId: number; studentId: number; relationship: string; createdAtEpoch: number | string };
type RunRow = RowDataPacket & Omit<MissionRecord, "state" | "createdAt" | "completedAt"> & {
  state: MissionState | string;
  createdAtEpoch: number | string;
  completedAtEpoch: number | string | null;
};

async function main() {
  const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const sourceWorkingTreeDirty = Boolean(execFileSync("git", ["status", "--porcelain", "--untracked-files=normal"], { cwd: root, encoding: "utf8" }).trim());
  const connection = await mysql.createConnection(target.connectionString);
  try {
    // This connection executes only SELECT statements. UNIX_TIMESTAMP keeps
    // the export independent of the server/session/Node display time zones.
    const [server] = await connection.query<RowDataPacket[]>("SELECT DATABASE() AS databaseName, VERSION() AS mysqlVersion");
    assert.equal(server[0]?.databaseName, target.databaseName, "Connected database does not match the explicit local lab name.");
    assert(!String(server[0]?.mysqlVersion).toLowerCase().includes("mariadb"), "This teaching export requires Oracle MySQL.");

    // Email is checked in SQL and never selected. IDs alone cannot authorize
    // exporting unrelated records that happen to be in the same local DB.
    const [users] = await connection.execute<UserRow[]>(
      `SELECT id, name, userType, gradeLevel FROM users
       WHERE (id = ? AND userType = 'student' AND REGEXP_LIKE(email, ?, 'c'))
          OR (id = ? AND userType = 'parent' AND REGEXP_LIKE(email, ?, 'c'))
       ORDER BY id`,
      [learnerId, "^mysql-demo-learner-[a-z0-9]+@example[.]test$", parentId, "^mysql-demo-parent-[a-z0-9]+@example[.]test$"],
    );
    assert.equal(users.length, 2, "Both exact IDs must belong to the expected fictional demo learner and parent.");
    assert(users.some(user => user.id === learnerId && user.userType === "student"));
    assert(users.some(user => user.id === parentId && user.userType === "parent"));

    const [links] = await connection.execute<LinkRow[]>(
      `SELECT id, parentId, studentId, relationship, UNIX_TIMESTAMP(createdAt) AS createdAtEpoch
       FROM parentStudentLinks WHERE parentId = ? AND studentId = ? ORDER BY id`,
      [parentId, learnerId],
    );
    assert(links.length > 0, "The selected demo parent and learner must have a saved relationship.");
    const [runs] = await connection.execute<RunRow[]>(
      `SELECT id, studentId, missionId, contentVersion, status, revision, state,
              UNIX_TIMESTAMP(createdAt) AS createdAtEpoch,
              UNIX_TIMESTAMP(completedAt) AS completedAtEpoch
       FROM missionRuns WHERE studentId = ? ORDER BY createdAt, id`,
      [learnerId],
    );
    const exportedAt = new Date().toISOString();
    const missionRuns = runs.map(row => {
      const state = typeof row.state === "string" ? JSON.parse(row.state) as MissionState : row.state;
      assert.equal(row.contentVersion, MISSION_CONTENT_VERSION, "A demo run uses an unsupported content version.");
      assert.equal(state.version, MISSION_CONTENT_VERSION, "A demo run uses an unsupported state version.");
      assert(["make-ten", "bridge-ten"].includes(row.missionId), "A demo run has an unknown mission.");
      const createdAt = timestamp(row.createdAtEpoch)!;
      const completedAt = timestamp(row.completedAtEpoch);
      assert(Date.parse(createdAt) <= Date.parse(exportedAt), "A demo run was created after the export time; check database time zones.");
      if (completedAt !== null) {
        assert(Date.parse(completedAt) >= Date.parse(createdAt), "A demo run completed before it was created; check database time zones.");
        assert(Date.parse(completedAt) <= Date.parse(exportedAt), "A demo run completed after the export time; check database time zones.");
      }
      assert.equal(row.status === "completed", completedAt !== null, "A demo run's status and completion timestamp disagree.");
      const record: MissionRecord = {
        id: row.id, studentId: row.studentId, missionId: row.missionId,
        contentVersion: row.contentVersion, status: row.status, revision: row.revision, state,
        createdAt: new Date(createdAt), completedAt: completedAt === null ? null : new Date(completedAt),
      };
      // State stays in this process. The exact application engine computes the
      // public summary, including problemCount and honest hint/error evidence.
      return {
        id: row.id, studentId: row.studentId, missionId: row.missionId,
        status: row.status, revision: row.revision, createdAt, completedAt,
        summary: summarizeMission(record),
      };
    });
    const payload = {
      exportedAt, mysqlVersion: String(server[0].mysqlVersion),
      databaseName: target.databaseName, sourceCommit, sourceWorkingTreeDirty,
      users: users.map(({ id, name, userType, gradeLevel }) => ({ id, name, userType, gradeLevel })),
      parentStudentLinks: links.map(({ id, parentId, studentId, relationship, createdAtEpoch }) => ({
        id, parentId, studentId, relationship, createdAt: timestamp(createdAtEpoch),
      })),
      missionRuns,
    };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(payload, null, 2) + "\n", { mode: 0o600 });
    console.log(`Exported ${payload.users.length} fictional accounts, ${payload.parentStudentLinks.length} saved link(s), and ${payload.missionRuns.length} mission run(s) to ${outputPath}.`);
  } finally {
    await connection.end();
  }
}

main().catch(error => { console.error(describeFailure(error)); process.exitCode = 1; });
