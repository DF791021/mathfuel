import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { missionRuns } from "../../drizzle/schema";
import { getDb } from "../db";
import { MISSION_DEFINITIONS, type MissionAction, type MissionId } from "../../shared/missions";
import { applyMissionAction, createMissionState, MISSION_CONTENT_VERSION, type MissionRecord } from "./engine";

async function connection() {
  const database = await getDb();
  if (!database) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Progress saving is unavailable. Please try again before starting." });
  return database;
}

export async function startMissionRun(studentId: number, missionId: MissionId): Promise<MissionRecord> {
  const database = await connection();
  const activeKey = `${studentId}:${missionId}`;
  // The unique key closes the double-click / concurrent-start race. Never reset
  // an existing run when the learner returns or retries an uncertain request.
  await database.insert(missionRuns).values({
    id: randomUUID(), studentId, missionId, activeKey,
    contentVersion: MISSION_CONTENT_VERSION, state: createMissionState(missionId),
  }).onDuplicateKeyUpdate({ set: { activeKey } });
  const [run] = await database.select().from(missionRuns).where(eq(missionRuns.activeKey, activeKey)).limit(1);
  if (!run) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The mission could not be opened. Please retry." });
  return run;
}

export async function getMissionRun(studentId: number, runId: string): Promise<MissionRecord> {
  const database = await connection();
  const [run] = await database.select().from(missionRuns).where(and(eq(missionRuns.id, runId), eq(missionRuns.studentId, studentId))).limit(1);
  if (!run) throw new TRPCError({ code: "NOT_FOUND", message: "Mission not found." });
  return run;
}

export async function actOnMissionRun(studentId: number, input: MissionAction): Promise<MissionRecord> {
  const database = await connection();
  return database.transaction(async transaction => {
    const [current] = await transaction.select().from(missionRuns)
      .where(and(eq(missionRuns.id, input.runId), eq(missionRuns.studentId, studentId)))
      .limit(1).for("update");
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Mission not found." });
    const next = applyMissionAction(current, input);
    if (next === current) return current;
    await transaction.update(missionRuns).set({
      state: next.state, revision: next.revision, status: next.status,
      completedAt: next.completedAt,
      activeKey: next.status === "completed" ? null : `${studentId}:${next.missionId}`,
    }).where(eq(missionRuns.id, input.runId));
    return next;
  });
}

export async function listMissionRuns(studentId: number): Promise<MissionRecord[]> {
  const database = await connection();
  const byMission = await Promise.all(MISSION_DEFINITIONS.map(mission => database.select().from(missionRuns)
    .where(and(eq(missionRuns.studentId, studentId), eq(missionRuns.missionId, mission.id)))
    .orderBy(desc(missionRuns.createdAt)).limit(10)));
  return byMission.flat();
}
