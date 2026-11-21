import { MISSION_DEFINITIONS, type MissionOverview, type MissionSummary } from "../../shared/missions";
import { listMissionRuns } from "./store";
import { missionReadiness, summarizeMission } from "./engine";

export async function getMissionOverview(studentId: number, includeActiveRunIds = true): Promise<MissionOverview> {
  const runs = await listMissionRuns(studentId);
  return {
    missions: MISSION_DEFINITIONS.map(mission => {
      const matching = runs.filter(run => run.missionId === mission.id);
      const summaries = matching.map(summarizeMission).filter((summary): summary is MissionSummary => summary !== null)
        .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
      return {
        ...mission,
        activeRunId: includeActiveRunIds ? matching.find(run => run.status === "in_progress")?.id ?? null : null,
        latest: summaries[0] ?? null,
        readiness: missionReadiness(summaries),
      };
    }),
  };
}
