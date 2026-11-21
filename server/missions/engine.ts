import { TRPCError } from "@trpc/server";
import { randomInt } from "node:crypto";
import { MISSION_DEFINITIONS, type MissionAction, type MissionId, type MissionReadiness, type MissionSummary, type MissionView } from "../../shared/missions";

export const MISSION_CONTENT_VERSION = 1;
export const PROBLEM_COUNT = 5;
const RETENTION_GAP_MS = 18 * 60 * 60 * 1000;

type StepEvidence = { wrongAnswers: number[]; hintsUsed: number; answer: number | null };
type Problem = { a: number; b: number; steps: StepEvidence[] };
export type MissionState = {
  version: 1;
  problems: Problem[];
  problemIndex: number;
  stepIndex: number;
  actions: Array<{ id: string; action: MissionAction["action"]; answer?: string }>;
};

export type MissionRecord = {
  id: string;
  studentId: number;
  missionId: MissionId;
  contentVersion: number;
  revision: number;
  status: "in_progress" | "completed";
  state: MissionState;
  completedAt: Date | null;
  createdAt: Date;
};

export function missionDefinition(id: MissionId) {
  return MISSION_DEFINITIONS.find(mission => mission.id === id)!;
}

export function createMissionState(missionId: MissionId): MissionState {
  const candidates = missionId === "make-ten"
    ? Array.from({ length: 9 }, (_, i) => ({ a: i + 1, b: 9 - i }))
    : [{ a: 8, b: 5 }, { a: 9, b: 4 }, { a: 7, b: 6 }, { a: 8, b: 7 }, { a: 6, b: 8 }, { a: 9, b: 7 }, { a: 7, b: 5 }, { a: 6, b: 7 }];
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return {
    version: 1,
    problems: candidates.slice(0, PROBLEM_COUNT).map(problem => ({
      ...problem,
      steps: Array.from({ length: missionId === "make-ten" ? 1 : 3 }, () => ({ wrongAnswers: [], hintsUsed: 0, answer: null })),
    })),
    problemIndex: 0,
    stepIndex: 0,
    actions: [],
  };
}

function assertVersion(run: MissionRecord) {
  if (run.contentVersion !== MISSION_CONTENT_VERSION || run.state.version !== MISSION_CONTENT_VERSION) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This saved mission needs its original content version. Your progress has been kept." });
  }
}

function expectedAnswer(run: MissionRecord) {
  const problem = run.state.problems[run.state.problemIndex];
  const gap = 10 - problem.a;
  return run.missionId === "make-ten" || run.state.stepIndex === 0
    ? gap
    : run.state.stepIndex === 1 ? problem.b - gap : problem.a + problem.b;
}

export function summarizeMission(run: MissionRecord): MissionSummary | null {
  if (run.status !== "completed" || !run.completedAt) return null;
  return {
    runId: run.id,
    missionId: run.missionId,
    title: missionDefinition(run.missionId).title,
    independent: run.state.problems.filter(problem => problem.steps.every(step => step.answer !== null && step.wrongAnswers.length === 0 && step.hintsUsed === 0)).length,
    firstTry: run.state.problems.filter(problem => problem.steps.every(step => step.answer !== null && step.wrongAnswers.length === 0)).length,
    hintsUsed: run.state.problems.reduce((total, problem) => total + problem.steps.reduce((sum, step) => sum + step.hintsUsed, 0), 0),
    wrongAnswers: run.state.problems.reduce((total, problem) => total + problem.steps.reduce((sum, step) => sum + step.wrongAnswers.length, 0), 0),
    problemCount: run.state.problems.length,
    completedAt: run.completedAt.toISOString(),
  };
}

export function missionView(run: MissionRecord): MissionView {
  assertVersion(run);
  const { state } = run;
  const view: MissionView = {
    id: run.id, missionId: run.missionId, title: missionDefinition(run.missionId).title,
    revision: run.revision, status: run.status, problemIndex: state.problemIndex,
    problemCount: state.problems.length, stepIndex: state.stepIndex,
    stepCount: run.missionId === "make-ten" ? 1 : 3,
    question: null, summary: summarizeMission(run),
  };
  if (run.status === "completed") return view;
  const problem = state.problems[state.problemIndex];
  const step = problem.steps[state.stepIndex];
  const gap = 10 - problem.a;
  const rest = problem.b - gap;
  const solved = step.answer !== null;
  const show = (answer: number) => solved ? String(answer) : "□";
  let kind: NonNullable<MissionView["question"]>["kind"] = "make-ten";
  let prompt = "How many more make ten?";
  let equation = `${problem.a} + ${show(gap)} = 10`;
  let hints = ["Point to each empty space in the ten-frame and count it once.", `Start at ${problem.a} and count up to ten. How many new numbers did you say?`];
  if (run.missionId === "bridge-ten") {
    if (state.stepIndex === 0) {
      kind = "bridge-gap";
      prompt = `Let's solve ${problem.a} + ${problem.b}. First, how many does ${problem.a} need to make ten?`;
    } else if (state.stepIndex === 1) {
      kind = "bridge-rest";
      prompt = `You moved ${gap} from ${problem.b} to make ten. How many are left?`;
      equation = `${problem.b} − ${gap} = ${show(rest)}`;
      hints = [`Count ${problem.b} counters. Move ${gap} of them into the ten-frame.`, `Count the counters that are still outside the full frame.`];
    } else {
      kind = "bridge-total";
      prompt = "Now add the full ten and the counters left over.";
      equation = `10 + ${rest} = ${show(problem.a + problem.b)}`;
      hints = ["The full frame is ten. Keep ten in your head and count on.", `Start at ten and count ${rest} more.`];
    }
  }
  view.question = {
    a: problem.a, b: problem.b, kind, prompt, equation, hintsUsed: step.hintsUsed,
    hint: step.hintsUsed ? hints[step.hintsUsed - 1] : null,
    solved, answer: step.answer,
    feedback: solved ? "You found it. Keep building!" : step.wrongAnswers.length ? "Let's try again. Look at the counters and take your time." : null,
  };
  return view;
}

/** Owns correctness, evidence and transitions. Client scores are never accepted. */
export function applyMissionAction(current: MissionRecord, input: MissionAction, now = new Date()): MissionRecord {
  assertVersion(current);
  const duplicate = current.state.actions.find(action => action.id === input.actionId);
  if (duplicate) {
    if (duplicate.action !== input.action || duplicate.answer !== input.answer) {
      throw new TRPCError({ code: "CONFLICT", message: "This action was already used. Refresh the mission before continuing." });
    }
    return current;
  }
  if (current.revision !== input.expectedRevision) {
    throw new TRPCError({ code: "CONFLICT", message: "Your mission changed in another tab. Refresh to continue from the saved step." });
  }
  if (current.status === "completed") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This mission is complete. Start a fresh mission to practice again." });
  }
  const run = structuredClone(current);
  const problem = run.state.problems[run.state.problemIndex];
  const step = problem.steps[run.state.stepIndex];
  if (input.action === "answer") {
    if (step.answer !== null) throw new TRPCError({ code: "BAD_REQUEST", message: "This step is already solved. Choose Next." });
    if (typeof input.answer !== "string" || !/^\d{1,2}$/.test(input.answer.trim()) || Number(input.answer) > 20) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a whole number from 0 to 20." });
    }
    const answer = Number(input.answer);
    if (answer === expectedAnswer(run)) step.answer = answer;
    else {
      // Bound unsuccessful guesses without preventing the learner from using
      // a hint, giving the correct answer, and finishing the saved mission.
      if (current.state.actions.length >= 1000) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Let's pause the guesses. Use the counters or a hint, then try the answer again." });
      }
      step.wrongAnswers.push(answer);
    }
  } else if (input.action === "hint") {
    if (step.answer !== null) throw new TRPCError({ code: "BAD_REQUEST", message: "This step is already solved." });
    if (step.hintsUsed >= 2) throw new TRPCError({ code: "BAD_REQUEST", message: "Both hints are already open." });
    step.hintsUsed += 1;
  } else {
    if (step.answer === null) throw new TRPCError({ code: "BAD_REQUEST", message: "Solve this step before continuing." });
    if (run.state.stepIndex + 1 < problem.steps.length) {
      run.state.stepIndex += 1;
    } else {
      run.state.problemIndex += 1;
      run.state.stepIndex = 0;
      if (run.state.problemIndex === run.state.problems.length) {
        run.status = "completed";
        run.completedAt = now;
      }
    }
  }
  run.state.actions.push({ id: input.actionId, action: input.action, ...(input.answer === undefined ? {} : { answer: input.answer }) });
  run.revision += 1;
  return run;
}

/** A transparent practice recommendation, not a permanent mastery claim. */
export function missionReadiness(summaries: MissionSummary[]): MissionReadiness {
  const recent = [...summaries].sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt)).slice(0, 3);
  if (!recent.length) return { status: "new", label: "Ready to try", explanation: "Start with a short mission. We will keep first tries and hints separate." };
  const strong = recent.filter(summary => summary.independent >= 4);
  const retained = strong.some((a, i) => strong.slice(i + 1).some(b => Math.abs(Date.parse(a.completedAt) - Date.parse(b.completedAt)) >= RETENTION_GAP_MS));
  if (retained) return {
    status: "ready", label: "Ready to build on this",
    explanation: "Our initial pilot rule: at least 4 of 5 problems solved independently in two of the last three missions, at least 18 hours apart. Try the next strategy and keep reviewing.",
  };
  return {
    status: "practicing", label: "Keep building",
    explanation: strong.length
      ? "A strong practice sample. Try a fresh mission tomorrow so we can check what sticks. One mission does not establish mastery."
      : "Practice with the counters, then try a fresh mission. Independent means first try with no hints; speed is not scored.",
  };
}
