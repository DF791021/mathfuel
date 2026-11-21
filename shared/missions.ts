export type MissionId = "make-ten" | "bridge-ten";

export const MISSION_DEFINITIONS = [
  {
    id: "make-ten" as const,
    title: "Make Ten",
    description: "Find the missing part of ten. Five problems, one useful strategy.",
  },
  {
    id: "bridge-ten" as const,
    title: "Bridge Through Ten",
    description: "Make ten first, then add what is left. Build on your ten-frame strategy.",
  },
];

export type MissionSummary = {
  runId: string;
  missionId: MissionId;
  title: string;
  independent: number;
  firstTry: number;
  hintsUsed: number;
  wrongAnswers: number;
  problemCount: number;
  completedAt: string;
};

export type MissionReadiness = {
  status: "new" | "practicing" | "ready";
  label: string;
  explanation: string;
};

export type MissionOverview = {
  missions: Array<{
    id: MissionId;
    title: string;
    description: string;
    readiness: MissionReadiness;
    activeRunId: string | null;
    latest: MissionSummary | null;
  }>;
};

export type MissionView = {
  id: string;
  missionId: MissionId;
  title: string;
  revision: number;
  status: "in_progress" | "completed";
  problemIndex: number;
  problemCount: number;
  stepIndex: number;
  stepCount: number;
  question: {
    prompt: string;
    equation: string;
    a: number;
    b: number;
    kind: "make-ten" | "bridge-gap" | "bridge-rest" | "bridge-total";
    hint: string | null;
    hintsUsed: number;
    solved: boolean;
    answer: number | null;
    feedback: string | null;
  } | null;
  summary: MissionSummary | null;
};

export type MissionAction = {
  runId: string;
  expectedRevision: number;
  actionId: string;
  action: "answer" | "hint" | "next";
  answer?: string;
};
