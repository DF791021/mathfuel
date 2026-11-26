import { protectedProcedure, router } from "../_core/trpc.js";
import { z } from "zod";
import * as db from "../db.js";

/**
 * Deterministic answer checking - no AI dependency for correctness
 */
function checkAnswer(studentAnswer: string, correctAnswer: string, answerType: string): boolean {
  const normalizedStudent = studentAnswer.trim().toLowerCase();
  const normalizedCorrect = correctAnswer.trim().toLowerCase();

  if (answerType === "number") {
    // Parse both as numbers for numeric comparison
    const studentNum = parseFloat(normalizedStudent);
    const correctNum = parseFloat(normalizedCorrect);
    if (isNaN(studentNum) || isNaN(correctNum)) return false;
    return Math.abs(studentNum - correctNum) < 0.001;
  }

  if (answerType === "boolean") {
    const trueValues = ["true", "yes", "1"];
    const falseValues = ["false", "no", "0"];
    const studentBool = trueValues.includes(normalizedStudent) ? true : falseValues.includes(normalizedStudent) ? false : null;
    const correctBool = trueValues.includes(normalizedCorrect) ? true : falseValues.includes(normalizedCorrect) ? false : null;
    return studentBool === correctBool;
  }

  // Text and choice: exact match after normalization
  return normalizedStudent === normalizedCorrect;
}

/**
 * Calculate mastery level from score
 */
function calculateMasteryLevel(score: number): "not_started" | "practicing" | "close" | "mastered" {
  if (score >= 90) return "mastered";
  if (score >= 70) return "close";
  if (score > 0) return "practicing";
  return "not_started";
}

/**
 * Determine next difficulty based on recent performance
 */
function getAdaptiveDifficulty(correctRate: number, currentDifficulty: number): number {
  if (correctRate >= 0.85) return Math.min(5, currentDifficulty + 1); // doing great, harder
  if (correctRate <= 0.4) return Math.max(1, currentDifficulty - 1); // struggling, easier
  return currentDifficulty; // stay at current level
}

export const practiceRouter = router({
  // Start a new practice session
  startSession: protectedProcedure
    .input(z.object({
      sessionType: z.enum(["daily", "practice", "review", "assessment"]).default("daily"),
      skillIds: z.array(z.number().int()).optional(), // specific skills to practice, or auto-select
      gradeLevel: z.number().int().min(1).max(12).default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create the session
      const result = await db.createPracticeSession({
        studentId: ctx.user.id,
        sessionType: input.sessionType,
        status: "in_progress",
        totalProblems: 0,
        correctAnswers: 0,
        hintsUsed: 0,
        totalTimeSeconds: 0,
        averageDifficulty: 100, // 1.00 * 100
        skillsFocused: input.skillIds ?? [],
      });

      return { sessionId: result?.id ?? 0 };
    }),

  // Get the next problem for a session (adaptive)
  getNextProblem: protectedProcedure
    .input(z.object({
      sessionId: z.number().int(),
      gradeLevel: z.number().int().min(1).max(12).default(1),
    }))
    .query(async ({ ctx, input }) => {
      const session = await db.getPracticeSession(input.sessionId);
      if (!session || session.studentId !== ctx.user.id) {
        throw new Error("Session not found");
      }

      // Get recent attempts to determine adaptive difficulty
      const attempts = await db.getSessionAttempts(input.sessionId);
      const recentAttempts = attempts.slice(-5);
      const correctRate = recentAttempts.length > 0
        ? recentAttempts.filter(a => a.isCorrect).length / recentAttempts.length
        : 0.5; // start at medium

      const currentDifficulty = session.averageDifficulty ? Math.round(session.averageDifficulty / 100) : 1;
      const nextDifficulty = getAdaptiveDifficulty(correctRate, currentDifficulty);

      // Get skills for this grade
      const skills = await db.getSkillsByGrade(input.gradeLevel);
      const skillIds = (session.skillsFocused as number[] | null)?.length
        ? (session.skillsFocused as number[])
        : skills.map(s => s.id);

      if (skillIds.length === 0) {
        return null; // no skills available
      }

      // Get problems at the adaptive difficulty
      const problems = await db.getProblemsForSession(skillIds, nextDifficulty, 1);

      if (problems.length === 0) {
        return null; // no more problems available
      }

      const problem = problems[0];
      return {
        id: problem.id,
        skillId: problem.skillId,
        problemType: problem.problemType,
        difficulty: problem.difficulty,
        questionText: problem.questionText,
        questionImage: problem.questionImage,
        answerType: problem.answerType,
        choices: problem.choices,
        // Don't send answer, explanation, or hints yet
      };
    }),

  // Submit an answer
  submitAnswer: protectedProcedure
    .input(z.object({
      sessionId: z.number().int(),
      problemId: z.number().int(),
      answer: z.string(),
      timeSpentSeconds: z.number().int().min(0).default(0),
      hintsViewed: z.number().int().min(0).default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const session = await db.getPracticeSession(input.sessionId);
      if (!session || session.studentId !== ctx.user.id) {
        throw new Error("Session not found");
      }

      const problem = await db.getProblemById(input.problemId);
      if (!problem) {
        throw new Error("Problem not found");
      }

      // Deterministic answer checking
      const isCorrect = checkAnswer(input.answer, problem.correctAnswer, problem.answerType);
      const isFirstTry = input.hintsViewed === 0;

      // Record the attempt
      await db.createProblemAttempt({
        sessionId: input.sessionId,
        studentId: ctx.user.id,
        problemId: input.problemId,
        skillId: problem.skillId,
        studentAnswer: input.answer,
        isCorrect,
        isFirstTry,
        hintsViewed: input.hintsViewed,
        timeSpentSeconds: input.timeSpentSeconds,
        difficulty: problem.difficulty,
      });

      // Update problem global stats
      await db.incrementProblemStats(input.problemId, isCorrect);

      // Update session stats
      const newTotal = (session.totalProblems ?? 0) + 1;
      const newCorrect = (session.correctAnswers ?? 0) + (isCorrect ? 1 : 0);
      const newHints = (session.hintsUsed ?? 0) + input.hintsViewed;
      const newTime = (session.totalTimeSeconds ?? 0) + input.timeSpentSeconds;
      await db.updatePracticeSession(input.sessionId, {
        totalProblems: newTotal,
        correctAnswers: newCorrect,
        hintsUsed: newHints,
        totalTimeSeconds: newTime,
      });

      // Update skill mastery
      const existingMastery = await db.getStudentSkillMasteryRecord(ctx.user.id, problem.skillId);
      const totalAttempts = (existingMastery?.totalAttempts ?? 0) + 1;
      const correctAttempts = (existingMastery?.correctAttempts ?? 0) + (isCorrect ? 1 : 0);
      const currentStreak = isCorrect ? (existingMastery?.currentStreak ?? 0) + 1 : 0;
      const bestStreak = Math.max(currentStreak, existingMastery?.bestStreak ?? 0);
      const masteryScore = Math.round((correctAttempts / totalAttempts) * 100);
      const masteryLevel = calculateMasteryLevel(masteryScore);

      await db.upsertStudentSkillMastery(ctx.user.id, problem.skillId, {
        masteryLevel,
        masteryScore,
        totalAttempts,
        correctAttempts,
        currentStreak,
        bestStreak,
        averageTimeSeconds: Math.round(((existingMastery?.averageTimeSeconds ?? 0) * (totalAttempts - 1) + input.timeSpentSeconds) / totalAttempts),
        lastPracticedAt: new Date(),
        masteredAt: masteryLevel === "mastered" && existingMastery?.masteryLevel !== "mastered" ? new Date() : null,
      });

      return {
        isCorrect,
        correctAnswer: problem.correctAnswer,
        explanation: problem.explanation,
        hintSteps: problem.hintSteps,
        masteryScore,
        masteryLevel,
        streak: currentStreak,
      };
    }),

  // Get a specific hint step
  getHint: protectedProcedure
    .input(z.object({
      problemId: z.number().int(),
      hintIndex: z.number().int().min(0),
    }))
    .query(async ({ input }) => {
      const problem = await db.getProblemById(input.problemId);
      if (!problem) throw new Error("Problem not found");

      const hints = problem.hintSteps as string[];
      if (input.hintIndex >= hints.length) {
        return { hint: null, hasMore: false, totalHints: hints.length };
      }

      return {
        hint: hints[input.hintIndex],
        hasMore: input.hintIndex < hints.length - 1,
        totalHints: hints.length,
      };
    }),

  // Complete a session
  completeSession: protectedProcedure
    .input(z.object({ sessionId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const session = await db.getPracticeSession(input.sessionId);
      if (!session || session.studentId !== ctx.user.id) {
        throw new Error("Session not found");
      }

      await db.updatePracticeSession(input.sessionId, {
        status: "completed",
        completedAt: new Date(),
      });

      // Update daily stats
      const today = new Date().toISOString().split("T")[0];
      const existingStats = await db.getStudentDailyStats(ctx.user.id, today);
      await db.upsertStudentDailyStats(ctx.user.id, today, {
        sessionsCompleted: (existingStats?.sessionsCompleted ?? 0) + 1,
        problemsAttempted: (existingStats?.problemsAttempted ?? 0) + (session.totalProblems ?? 0),
        problemsCorrect: (existingStats?.problemsCorrect ?? 0) + (session.correctAnswers ?? 0),
        hintsUsed: (existingStats?.hintsUsed ?? 0) + (session.hintsUsed ?? 0),
        totalTimeSeconds: (existingStats?.totalTimeSeconds ?? 0) + (session.totalTimeSeconds ?? 0),
        skillsImproved: 0, // calculated separately
      });

      // Update streak
      const streak = await db.getStudentStreak(ctx.user.id);
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      let newCurrentStreak = 1;
      let newLongestStreak = streak?.longestStreak ?? 0;
      let newTotalActiveDays = (streak?.totalActiveDays ?? 0);

      if (streak?.lastActiveDate === today) {
        // Already active today, don't change streak
        newCurrentStreak = streak.currentStreak;
      } else if (streak?.lastActiveDate === yesterday) {
        // Continuing streak
        newCurrentStreak = (streak.currentStreak ?? 0) + 1;
        newTotalActiveDays += 1;
      } else {
        // Streak broken or first day
        newCurrentStreak = 1;
        newTotalActiveDays += 1;
      }
      newLongestStreak = Math.max(newLongestStreak, newCurrentStreak);

      await db.upsertStudentStreak(ctx.user.id, {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastActiveDate: today,
        totalActiveDays: newTotalActiveDays,
      });

      // Check for badge awards
      const badges = [];
      if (newCurrentStreak === 3) badges.push({ type: "streak_3", title: "3-Day Streak!", icon: "🔥" });
      if (newCurrentStreak === 7) badges.push({ type: "streak_7", title: "Week Warrior!", icon: "⭐" });
      if (newCurrentStreak === 30) badges.push({ type: "streak_30", title: "Monthly Master!", icon: "🏆" });
      if ((session.correctAnswers ?? 0) === (session.totalProblems ?? 0) && (session.totalProblems ?? 0) >= 5) {
        badges.push({ type: "perfect_session", title: "Perfect Session!", icon: "💯" });
      }

      for (const badge of badges) {
        await db.awardBadge({
          studentId: ctx.user.id,
          badgeType: badge.type,
          title: badge.title,
          icon: badge.icon,
          description: `Earned on ${today}`,
        });
      }

      return {
        totalProblems: session.totalProblems,
        correctAnswers: session.correctAnswers,
        accuracy: session.totalProblems ? Math.round(((session.correctAnswers ?? 0) / session.totalProblems) * 100) : 0,
        timeSpent: session.totalTimeSeconds,
        streak: newCurrentStreak,
        badgesEarned: badges,
      };
    }),

  // Get session history
  getSessionHistory: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      return db.getStudentSessions(ctx.user.id, input.limit);
    }),
});
