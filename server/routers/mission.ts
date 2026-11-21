import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { actOnMissionRun, getMissionRun, startMissionRun } from "../missions/store";
import { missionView } from "../missions/engine";
import { getMissionOverview } from "../missions/overview";

const learnerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.userType !== "student") throw new TRPCError({ code: "FORBIDDEN", message: "Open a student account to practice a mission." });
  return next({ ctx });
});

export const missionRouter = router({
  getOverview: learnerProcedure.query(({ ctx }) => getMissionOverview(ctx.user.id)),
  start: learnerProcedure.input(z.object({ missionId: z.enum(["make-ten", "bridge-ten"]) })).mutation(async ({ ctx, input }) =>
    missionView(await startMissionRun(ctx.user.id, input.missionId))),
  getRun: learnerProcedure.input(z.object({ runId: z.string().uuid() })).query(async ({ ctx, input }) =>
    missionView(await getMissionRun(ctx.user.id, input.runId))),
  act: learnerProcedure.input(z.object({
    runId: z.string().uuid(), expectedRevision: z.number().int().nonnegative(), actionId: z.string().uuid(),
    action: z.enum(["answer", "hint", "next"]), answer: z.string().max(20).optional(),
  }).strict()).mutation(async ({ ctx, input }) => missionView(await actOnMissionRun(ctx.user.id, input))),
});
