import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { getMissionOverview } from "../missions/overview";

function generateInviteCode(): string {
  // Generate a 6-character alphanumeric code (easy to type for kids/parents)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1 to avoid confusion
  let code = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export const parentRouter = router({
  // ── Student generates an invite code for their parent ──
  generateInviteCode: protectedProcedure.mutation(async ({ ctx }) => {
    // Only students can generate invite codes
    if (ctx.user.userType !== "student") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only students can generate invite codes.",
      });
    }

    // Check for existing active (unused, unexpired) code
    const existingCodes = await db.getStudentInviteCodes(ctx.user.id);
    const now = new Date();
    const activeCode = existingCodes.find(
      (c) => !c.usedBy && c.expiresAt > now
    );

    if (activeCode) {
      return {
        code: activeCode.code,
        expiresAt: activeCode.expiresAt,
        isExisting: true,
      };
    }

    // Generate a new code valid for 7 days
    const code = generateInviteCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.createInviteCode(ctx.user.id, code, expiresAt);

    return {
      code,
      expiresAt,
      isExisting: false,
    };
  }),

  // ── Get student's active invite codes ──
  getMyInviteCodes: protectedProcedure.query(async ({ ctx }) => {
    const codes = await db.getStudentInviteCodes(ctx.user.id);
    const now = new Date();
    return codes.map((c) => ({
      id: c.id,
      code: c.code,
      expiresAt: c.expiresAt,
      isActive: !c.usedBy && c.expiresAt > now,
      usedBy: c.usedBy,
      usedAt: c.usedAt,
    }));
  }),

  // ── Parent redeems an invite code to link to a student ──
  redeemInviteCode: protectedProcedure
    .input(
      z.object({
        code: z
          .string()
          .min(1)
          .transform((s) => s.toUpperCase().trim()),
        relationship: z.string().default("parent"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only parents can redeem invite codes
      if (ctx.user.userType !== "parent") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only parent accounts can link to students.",
        });
      }

      // Look up the code
      const inviteCode = await db.getInviteCodeByCode(input.code);
      if (!inviteCode) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid invite code. Please check and try again.",
        });
      }

      // Check if already used
      if (inviteCode.usedBy) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invite code has already been used.",
        });
      }

      // Check if expired
      if (inviteCode.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This invite code has expired. Ask your child to generate a new one.",
        });
      }

      // Check if already linked
      const existingLinks = await db.getParentStudents(ctx.user.id);
      const alreadyLinked = existingLinks.some(
        (l) => l.studentId === inviteCode.studentId
      );
      if (alreadyLinked) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are already linked to this student.",
        });
      }

      // Link parent to student
      await db.linkParentStudent(
        ctx.user.id,
        inviteCode.studentId,
        input.relationship
      );

      // Mark invite code as used
      await db.markInviteCodeUsed(inviteCode.id, ctx.user.id);

      // Get the student info to return
      const student = await db.getUserById(inviteCode.studentId);

      return {
        success: true,
        studentName: student?.name ?? "Student",
        studentId: inviteCode.studentId,
      };
    }),

  // ── Legacy: Link a child directly by ID (admin use) ──
  linkChild: adminProcedure
    .input(
      z.object({
        childId: z.number().int(),
        relationship: z.string().default("parent"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const child = await db.getUserById(input.childId);
      if (!child)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      await db.linkParentStudent(ctx.user.id, input.childId, input.relationship);
      return { success: true };
    }),

  // ── Get linked children with progress summary ──
  getChildren: protectedProcedure.query(async ({ ctx }) => {
    const links = await db.getParentStudents(ctx.user.id);
    const children = [];
    for (const link of links) {
      const child = await db.getUserById(link.studentId);
      if (child) {
        const streak = await db.getStudentStreak(link.studentId);
        const mastery = await db.getStudentMastery(link.studentId);
        const recentSessions = await db.getStudentSessions(link.studentId, 5);

        const totalMastered = mastery.filter(
          (m) => m.masteryLevel === "mastered"
        ).length;
        const overallAccuracy =
          mastery.length > 0
            ? Math.round(
                mastery.reduce((sum, m) => sum + m.masteryScore, 0) /
                  mastery.length
              )
            : 0;

        children.push({
          id: child.id,
          name: child.name,
          gradeLevel: child.gradeLevel,
          relationship: link.relationship,
          streak: streak?.currentStreak ?? 0,
          longestStreak: streak?.longestStreak ?? 0,
          totalActiveDays: streak?.totalActiveDays ?? 0,
          skillsMastered: totalMastered,
          totalSkills: mastery.length,
          overallAccuracy,
          recentSessions: recentSessions.map((s) => ({
            id: s.id,
            sessionType: s.sessionType,
            totalProblems: s.totalProblems,
            correctAnswers: s.correctAnswers,
            hintsUsed: s.hintsUsed,
            completedAt: s.completedAt,
          })),
        });
      }
    }
    return children;
  }),

  // ── Get detailed progress for a specific child ──
  getMissionProgress: protectedProcedure
    .input(z.object({ childId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.userType !== "parent") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only a linked parent can view these mission results." });
      }
      const links = await db.getParentStudents(ctx.user.id);
      if (!links.some(link => link.studentId === input.childId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not linked to this student." });
      }
      return getMissionOverview(input.childId, false);
    }),

  getChildProgress: protectedProcedure
    .input(z.object({ childId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      // Verify parent-child link
      const links = await db.getParentStudents(ctx.user.id);
      const isLinked = links.some((l) => l.studentId === input.childId);
      if (!isLinked)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not your child",
        });

      const [mastery, streak, badges, sessions] = await Promise.all([
        db.getStudentMastery(input.childId),
        db.getStudentStreak(input.childId),
        db.getStudentBadges(input.childId),
        db.getStudentSessions(input.childId, 20),
      ]);

      // Get last 7 days of stats
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 7 * 86400000)
        .toISOString()
        .split("T")[0];
      const dailyStats = await db.getStudentStatsRange(
        input.childId,
        startDate,
        endDate
      );

      return {
        mastery,
        streak,
        badges,
        sessions,
        dailyStats,
      };
    }),

  // ── Unlink a child ──
  unlinkChild: protectedProcedure
    .input(z.object({ childId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const links = await db.getParentStudents(ctx.user.id);
      const isLinked = links.some((l) => l.studentId === input.childId);
      if (!isLinked)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not linked to this student",
        });

      await db.unlinkParentStudent(ctx.user.id, input.childId);
      return { success: true };
    }),
});
