import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { applyMissionAction, createMissionState, missionReadiness, missionView, summarizeMission, type MissionRecord } from "./missions/engine";
import type { MissionAction, MissionId, MissionSummary } from "../shared/missions";

function run(missionId: MissionId = "make-ten"): MissionRecord {
  return { id: randomUUID(), studentId: 1, missionId, contentVersion: 1, revision: 0, status: "in_progress", state: createMissionState(missionId), createdAt: new Date("2026-11-20T12:00:00Z"), completedAt: null };
}
function act(record: MissionRecord, action: MissionAction["action"], answer?: string) {
  return applyMissionAction(record, { runId: record.id, actionId: randomUUID(), expectedRevision: record.revision, action, answer });
}
function answerFor(record: MissionRecord) {
  const q = missionView(record).question!;
  return q.kind === "make-ten" || q.kind === "bridge-gap" ? 10 - q.a : q.kind === "bridge-rest" ? q.b - (10 - q.a) : q.a + q.b;
}
function finish(record: MissionRecord) {
  while (record.status !== "completed") {
    if (!missionView(record).question!.solved) record = act(record, "answer", String(answerFor(record)));
    record = act(record, "next");
  }
  return record;
}

describe("server-owned ten missions", () => {
  it.each(["make-ten", "bridge-ten"] as const)("finishes %s only after all five problems and records independent work", missionId => {
    const completed = finish(run(missionId));
    expect(summarizeMission(completed)).toMatchObject({ missionId, independent: 5, firstTry: 5, hintsUsed: 0, wrongAnswers: 0 });
    expect(completed.state.problems.flatMap(p => p.steps).every(step => step.answer !== null)).toBe(true);
    expect(missionView(completed).question).toBeNull();
  });

  it("separates independent work from hinted first-try work", () => {
    const completed = finish(act(run(), "hint"));
    expect(summarizeMission(completed)).toMatchObject({ independent: 4, firstTry: 5, hintsUsed: 1, wrongAnswers: 0 });
  });

  it("counts a corrected answer honestly even when the mission is eventually complete", () => {
    const started = run();
    const corrected = finish(act(started, "answer", "0"));
    expect(summarizeMission(corrected)).toMatchObject({ independent: 4, firstTry: 4, wrongAnswers: 1 });
  });

  it("counts support on any bridge step against independence for that whole problem", () => {
    let current = run("bridge-ten");
    current = act(current, "answer", String(answerFor(current)));
    current = act(current, "next");
    current = act(current, "hint");
    expect(summarizeMission(finish(current))).toMatchObject({ independent: 4, firstTry: 5, hintsUsed: 1 });
  });

  it("persists a solved step so reloading cannot erase its hint evidence", () => {
    let current = act(run(), "hint");
    current = act(current, "answer", String(answerFor(current)));
    const restored = structuredClone(current);
    expect(missionView(restored).question).toMatchObject({ solved: true, hintsUsed: 1 });
    expect(summarizeMission(finish(restored))?.independent).toBe(4);
  });

  it("makes retries idempotent even after later progress", () => {
    let current = run();
    const input: MissionAction = { runId: current.id, actionId: randomUUID(), expectedRevision: 0, action: "hint" };
    current = applyMissionAction(current, input);
    current = act(current, "answer", String(answerFor(current)));
    expect(applyMissionAction(current, input)).toBe(current);
    expect(current.state.problems[0].steps[0].hintsUsed).toBe(1);
    expect(() => applyMissionAction(current, { ...input, action: "next" })).toThrow(/already used/);
  });

  it("rejects stale tabs, premature completion and edits after completion", () => {
    const initial = run();
    expect(() => act(initial, "next")).toThrow(/Solve this step/);
    const updated = act(initial, "hint");
    expect(() => applyMissionAction(updated, { runId: updated.id, actionId: randomUUID(), expectedRevision: 0, action: "hint" })).toThrow(/another tab/);
    expect(() => act(finish(updated), "next")).toThrow(/complete/);
  });

  it.each(["4x", "1.5", "", "-1", "21", "Infinity", "1e1"])("rejects malformed answer %j without altering evidence", answer => {
    const current = run();
    expect(() => act(current, "answer", answer)).toThrow(/whole number/);
    expect(current.revision).toBe(0);
    expect(current.state.actions).toHaveLength(0);
  });

  it("keeps saved progress untouched when content versions differ", () => {
    const current = { ...run(), contentVersion: 99 };
    expect(() => act(current, "hint")).toThrow(/original content version/);
    expect(current.revision).toBe(0);
  });

  it("uses five distinct problems within a mission", () => {
    for (const id of ["make-ten", "bridge-ten"] as const) {
      const started = run(id);
      expect(new Set(started.state.problems.map(p => `${p.a},${p.b}`)).size).toBe(5);
      expect(started.state.problems.every(p => id === "make-ten" ? p.a + p.b === 10 : p.a + p.b > 10 && p.a + p.b < 20)).toBe(true);
    }
  });
});

describe("readiness recommendations", () => {
  const summary = (completedAt: string, independent = 5): MissionSummary => ({ runId: randomUUID(), missionId: "make-ten", title: "Make Ten", independent, firstTry: 5, hintsUsed: 0, wrongAnswers: 0, problemCount: 5, completedAt });
  it("requires retained evidence rather than one perfect or repeated immediate attempt", () => {
    expect(missionReadiness([]).status).toBe("new");
    expect(missionReadiness([summary("2026-11-20T12:00:00Z")]).status).toBe("practicing");
    expect(missionReadiness([summary("2026-11-20T12:00:00Z"), summary("2026-11-20T12:10:00Z")]).status).toBe("practicing");
    expect(missionReadiness([summary("2026-11-20T12:00:00Z", 4), summary("2026-11-21T12:00:00Z", 4)]).status).toBe("ready");
  });
  it("uses recent performance so old successes do not mask current difficulty", () => {
    const samples = [summary("2026-11-17T12:00:00Z"), summary("2026-11-18T12:00:00Z"), summary("2026-11-19T12:00:00Z", 2), summary("2026-11-20T12:00:00Z", 2), summary("2026-11-21T12:00:00Z", 2)];
    expect(missionReadiness(samples).status).toBe("practicing");
  });
});
