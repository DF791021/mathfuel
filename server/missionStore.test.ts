import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMissionState, missionView, type MissionRecord } from "./missions/engine";
import type { MissionAction } from "../shared/missions";

const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
import { actOnMissionRun } from "./missions/store";

describe("mission completion storage boundary", () => {
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it("returns MySQL's persisted completion timestamp rather than the higher-precision application clock", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-21T15:00:00.123Z"));
    const state = createMissionState("make-ten");
    state.problemIndex = 4;
    for (const problem of state.problems) problem.steps[0].answer = 10 - problem.a;
    const current: MissionRecord = {
      id: randomUUID(), studentId: 1, missionId: "make-ten", contentVersion: 1,
      revision: 9, status: "in_progress", state, createdAt: new Date("2026-11-21T14:55:00Z"), completedAt: null,
    };
    const action: MissionAction = { runId: current.id, actionId: randomUUID(), expectedRevision: 9, action: "next" };
    let saved: MissionRecord | undefined;
    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const transaction = {
      select: vi.fn()
        .mockReturnValueOnce({ from: () => ({ where: () => ({ limit: () => ({ for: async () => [structuredClone(current)] }) }) }) })
        .mockReturnValueOnce({ from: () => ({ where: () => ({ limit: async () => [saved] }) }) }),
      update: () => ({ set: (values: Partial<MissionRecord>) => {
        // Model the real TIMESTAMP round-trip identified by live MySQL tests.
        saved = { ...current, ...values, completedAt: new Date("2026-11-21T15:00:00.000Z") };
        return { where: updateWhere };
      } }),
    };
    mocks.getDb.mockResolvedValue({ transaction: async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction) });
    const completed = await actOnMissionRun(1, action);
    expect(completed.status).toBe("completed");
    expect(completed.completedAt?.toISOString()).toBe("2026-11-21T15:00:00.000Z");
    expect(missionView(completed)).toEqual(missionView(saved!));
    expect(missionView(completed).summary).toMatchObject({ independent: 5, firstTry: 5, hintsUsed: 0 });
  });
});
