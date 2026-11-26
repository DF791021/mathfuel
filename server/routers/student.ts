import { protectedProcedure, router } from "../_core/trpc.js";
import { z } from "zod";
import * as db from "../db.js";

export const studentRouter = router({
  // Get student dashboard data
  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    const [mastery, streak, badges, recentSessions] = await Promise.all([
      db.getStudentMastery(ctx.user.id),
      db.getStudentStreak(ctx.user.id),
      db.getStudentBadges(ctx.user.id),
      db.getStudentSessions(ctx.user.id, 5),
    ]);

    // Calculate overall stats
    const totalMastered = mastery.filter(m => m.masteryLevel === "mastered").length;
    const totalPracticing = mastery.filter(m => m.masteryLevel === "practicing" || m.masteryLevel === "close").length;
    const overallAccuracy = mastery.length > 0
      ? Math.round(mastery.reduce((sum, m) => sum + m.masteryScore, 0) / mastery.length)
      : 0;

    return {
      streak: streak ?? { currentStreak: 0, longestStreak: 0, totalActiveDays: 0 },
      mastery: {
        totalSkills: mastery.length,
        mastered: totalMastered,
        practicing: totalPracticing,
        overallAccuracy,
        skills: mastery,
      },
      badges: badges.slice(0, 10),
      recentSessions,
    };
  }),

  // Get mastery for all skills
  getMastery: protectedProcedure.query(async ({ ctx }) => {
    return db.getStudentMastery(ctx.user.id);
  }),

  // Get mastery for a specific skill
  getSkillMastery: protectedProcedure
    .input(z.object({ skillId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return db.getStudentSkillMasteryRecord(ctx.user.id, input.skillId);
    }),

  // Get streak info
  getStreak: protectedProcedure.query(async ({ ctx }) => {
    return db.getStudentStreak(ctx.user.id) ?? {
      currentStreak: 0,
      longestStreak: 0,
      totalActiveDays: 0,
      lastActiveDate: null,
    };
  }),

  // Get all badges
  getBadges: protectedProcedure.query(async ({ ctx }) => {
    return db.getStudentBadges(ctx.user.id);
  }),

  // Get daily stats for a date range
  getStatsRange: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return db.getStudentStatsRange(ctx.user.id, input.startDate, input.endDate);
    }),
});
