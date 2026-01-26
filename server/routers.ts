import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Children management (admin only)
  children: router({
    // List all children for the logged-in admin
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getChildrenByAdminId(ctx.user.id);
    }),

    // Get a single child by ID (must belong to admin)
    get: protectedProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ ctx, input }) => {
        const child = await db.getChildById(input.childId);
        if (!child || child.adminId !== ctx.user.id) {
          return null;
        }
        return child;
      }),

    // Create a new child
    create: protectedProcedure
      .input(z.object({
        firstName: z.string().min(1).max(100),
        grade: z.number().min(1).max(12).default(1),
        avatar: z.string().max(50).optional(),
        pin: z.string().length(4).regex(/^\d{4}$/).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const childId = await db.createChild({
          adminId: ctx.user.id,
          firstName: input.firstName,
          grade: input.grade,
          avatar: input.avatar ?? null,
          pin: input.pin ?? null,
        });
        return { childId };
      }),

    // Update a child
    update: protectedProcedure
      .input(z.object({
        childId: z.number(),
        firstName: z.string().min(1).max(100).optional(),
        grade: z.number().min(1).max(12).optional(),
        avatar: z.string().max(50).optional(),
        pin: z.string().length(4).regex(/^\d{4}$/).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const child = await db.getChildById(input.childId);
        if (!child || child.adminId !== ctx.user.id) {
          throw new Error("Child not found or access denied");
        }
        
        const updates: Record<string, unknown> = {};
        if (input.firstName !== undefined) updates.firstName = input.firstName;
        if (input.grade !== undefined) updates.grade = input.grade;
        if (input.avatar !== undefined) updates.avatar = input.avatar;
        if (input.pin !== undefined) updates.pin = input.pin;
        
        await db.updateChild(input.childId, updates);
        return { success: true };
      }),

    // Delete a child
    delete: protectedProcedure
      .input(z.object({ childId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const child = await db.getChildById(input.childId);
        if (!child || child.adminId !== ctx.user.id) {
          throw new Error("Child not found or access denied");
        }
        await db.deleteChild(input.childId);
        return { success: true };
      }),
  }),

  // Session management (for recording practice sessions)
  sessions: router({
    // Get sessions for a child
    list: protectedProcedure
      .input(z.object({ 
        childId: z.number(),
        limit: z.number().min(1).max(100).default(50),
      }))
      .query(async ({ ctx, input }) => {
        const child = await db.getChildById(input.childId);
        if (!child || child.adminId !== ctx.user.id) {
          return [];
        }
        return db.getSessionsByChildId(input.childId, input.limit);
      }),

    // Record a completed session
    create: protectedProcedure
      .input(z.object({
        childId: z.number(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        totalProblems: z.number().min(1),
        correctAnswers: z.number().min(0),
        accuracy: z.number().min(0).max(100),
        averageTime: z.number().min(0),
        starsEarned: z.number().min(0).max(3),
        difficultyLevel: z.number().min(1).max(5),
        crossingTenCorrect: z.number().min(0).default(0),
        crossingTenTotal: z.number().min(0).default(0),
        problemDetails: z.string().optional(), // JSON string
      }))
      .mutation(async ({ ctx, input }) => {
        const child = await db.getChildById(input.childId);
        if (!child || child.adminId !== ctx.user.id) {
          throw new Error("Child not found or access denied");
        }

        // Create the session record
        const sessionId = await db.createSession({
          childId: input.childId,
          date: input.date,
          totalProblems: input.totalProblems,
          correctAnswers: input.correctAnswers,
          accuracy: input.accuracy,
          averageTime: input.averageTime,
          starsEarned: input.starsEarned,
          difficultyLevel: input.difficultyLevel,
          crossingTenCorrect: input.crossingTenCorrect,
          crossingTenTotal: input.crossingTenTotal,
          problemDetails: input.problemDetails ?? null,
        });

        // Update child's aggregate stats
        await db.updateChildAfterSession(input.childId, {
          starsEarned: input.starsEarned,
          totalProblems: input.totalProblems,
          correctAnswers: input.correctAnswers,
          crossingTenCorrect: input.crossingTenCorrect,
          crossingTenTotal: input.crossingTenTotal,
          date: input.date,
          accuracy: input.accuracy,
        });

        return { sessionId };
      }),
  }),

  // Public endpoint for student login (by child ID + optional PIN)
  student: router({
    // Verify student login (no auth required - students don't have accounts)
    login: publicProcedure
      .input(z.object({
        childId: z.number(),
        pin: z.string().length(4).regex(/^\d{4}$/).optional(),
      }))
      .mutation(async ({ input }) => {
        const child = await db.getChildById(input.childId);
        if (!child) {
          return { success: false, error: "Student not found" };
        }
        
        // If child has a PIN, verify it
        if (child.pin && child.pin !== input.pin) {
          return { success: false, error: "Incorrect PIN" };
        }
        
        return { 
          success: true, 
          child: {
            id: child.id,
            firstName: child.firstName,
            grade: child.grade,
            avatar: child.avatar,
            difficultyLevel: child.difficultyLevel,
            totalStars: child.totalStars,
            currentStreak: child.currentStreak,
          }
        };
      }),

    // Get child data for student view (limited info)
    getProgress: publicProcedure
      .input(z.object({ childId: z.number() }))
      .query(async ({ input }) => {
        const child = await db.getChildById(input.childId);
        if (!child) return null;
        
        return {
          id: child.id,
          firstName: child.firstName,
          difficultyLevel: child.difficultyLevel,
          totalStars: child.totalStars,
          currentStreak: child.currentStreak,
          badges: child.badges ? JSON.parse(child.badges) : [],
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
