import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { applyMissionAction, createMissionState, type MissionRecord } from "./missions/engine";
import type { MissionAction, MissionId, MissionView } from "../shared/missions";

const mocks = vi.hoisted(() => ({ start: vi.fn(), get: vi.fn(), act: vi.fn(), list: vi.fn(), links: vi.fn(), link: vi.fn(), user: vi.fn() }));
vi.mock("./missions/store", () => ({ startMissionRun: mocks.start, getMissionRun: mocks.get, actOnMissionRun: mocks.act, listMissionRuns: mocks.list }));
vi.mock("./db", () => ({ getParentStudents: mocks.links, linkParentStudent: mocks.link, getUserById: mocks.user }));
import { missionRouter } from "./routers/mission";
import { parentRouter } from "./routers/parent";

function context(id: number, userType: "student" | "parent", role = "user"): TrpcContext {
  return { req: { headers: {} }, res: {}, user: { id, userType, role, name: "Test learner" } } as TrpcContext;
}

// Actual tRPC middleware, input validation, mission engine, overview and parent
// authorization run against a deliberately in-memory persistence boundary.
// MySQL migration/locking verification is a separate release gate.
describe("learner-to-linked-parent mission flow", () => {
  let rows: Map<string, MissionRecord>;
  let linked: boolean;
  beforeEach(() => {
    vi.clearAllMocks(); rows = new Map(); linked = true;
    mocks.start.mockImplementation(async (studentId: number, missionId: MissionId) => {
      const existing = [...rows.values()].find(row => row.studentId === studentId && row.missionId === missionId && row.status === "in_progress");
      if (existing) return structuredClone(existing);
      const row: MissionRecord = { id: randomUUID(), studentId, missionId, contentVersion: 1, revision: 0, status: "in_progress", state: createMissionState(missionId), createdAt: new Date(), completedAt: null };
      rows.set(row.id, row); return structuredClone(row);
    });
    const owned = (studentId: number, runId: string) => {
      const row = rows.get(runId);
      if (!row || row.studentId !== studentId) throw new TRPCError({ code: "NOT_FOUND" });
      return structuredClone(row);
    };
    mocks.get.mockImplementation(async (studentId: number, runId: string) => owned(studentId, runId));
    mocks.act.mockImplementation(async (studentId: number, input: MissionAction) => {
      const next = applyMissionAction(owned(studentId, input.runId), input);
      rows.set(next.id, next); return structuredClone(next);
    });
    mocks.list.mockImplementation(async (studentId: number) => [...rows.values()].filter(row => row.studentId === studentId).map(row => structuredClone(row)));
    mocks.links.mockImplementation(async (parentId: number) => linked && parentId === 10 ? [{ studentId: 1, parentId: 10 }] : []);
  });

  const answer = (view: MissionView) => {
    const q = view.question!;
    return String(q.kind === "make-ten" || q.kind === "bridge-gap" ? 10 - q.a : q.kind === "bridge-rest" ? q.b - (10 - q.a) : q.a + q.b);
  };

  it("saves each step, resumes it, and shows separate honest results to the linked parent", async () => {
    const learner = missionRouter.createCaller(context(1, "student"));
    const parent = parentRouter.createCaller(context(10, "parent"));
    for (const missionId of ["make-ten", "bridge-ten"] as const) {
      let view = await learner.start({ missionId });
      view = await learner.act({ runId: view.id, expectedRevision: view.revision, actionId: randomUUID(), action: "hint" });
      const reopened = await learner.start({ missionId });
      expect(reopened.id).toBe(view.id);
      expect(reopened.question?.hintsUsed).toBe(1);
      while (view.status !== "completed") {
        view = await learner.act({ runId: view.id, expectedRevision: view.revision, actionId: randomUUID(), action: "answer", answer: answer(view) });
        view = await learner.act({ runId: view.id, expectedRevision: view.revision, actionId: randomUUID(), action: "next" });
      }
      expect(view.summary).toMatchObject({ independent: 4, firstTry: 5, hintsUsed: 1 });
    }
    const progress = await parent.getMissionProgress({ childId: 1 });
    expect(progress.missions).toHaveLength(2);
    for (const mission of progress.missions) {
      expect(mission.latest).toMatchObject({ missionId: mission.id, independent: 4, firstTry: 5, hintsUsed: 1 });
      expect(mission.activeRunId).toBeNull();
      expect(mission.readiness.status).toBe("practicing");
    }
  });

  it("denies unlinked and revoked parents and blocks direct-ID linking bypass", async () => {
    const parent = parentRouter.createCaller(context(10, "parent"));
    await expect(parent.getMissionProgress({ childId: 1 })).resolves.toBeDefined();
    await expect(parentRouter.createCaller(context(20, "parent")).getMissionProgress({ childId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    linked = false;
    await expect(parent.getMissionProgress({ childId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(parent.linkChild({ childId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.link).not.toHaveBeenCalled();
  });

  it("does not let parents write learner results, or learners read another learner's run", async () => {
    const learner = missionRouter.createCaller(context(1, "student"));
    const run = await learner.start({ missionId: "make-ten" });
    await expect(missionRouter.createCaller(context(2, "student")).getRun({ runId: run.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(missionRouter.createCaller(context(10, "parent")).start({ missionId: "make-ten" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(parentRouter.createCaller(context(1, "student")).getMissionProgress({ childId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects anonymous writes and client-supplied scores", async () => {
    await expect(missionRouter.createCaller({ req: {}, res: {}, user: null } as TrpcContext).start({ missionId: "make-ten" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const learner = missionRouter.createCaller(context(1, "student"));
    const run = await learner.start({ missionId: "make-ten" });
    await expect(learner.act({ runId: run.id, actionId: randomUUID(), expectedRevision: 0, action: "answer", answer: "0", independent: 5 } as MissionAction)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
