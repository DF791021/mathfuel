import { protectedProcedure, router } from "../_core/trpc.js";
import { invokeLLM } from "../_core/llm.js";
import { z } from "zod";
import * as db from "../db.js";

/**
 * AI Tutor Router
 *
 * Provides dynamic, age-appropriate hints and explanations using LLM.
 * Design philosophy: help students UNDERSTAND concepts, never just give answers.
 * All responses are scaffolded for Grade 1-2 reading level.
 */

const SYSTEM_PROMPT = `You are MathBuddy, a warm and encouraging math tutor for children in Grades 1-2 (ages 6-8).

RULES:
- Use simple words a 6-year-old can read (no words over 3 syllables unless necessary)
- Keep sentences short (under 12 words each)
- Be warm, patient, and encouraging — never condescending
- Use concrete examples kids can picture (fingers, apples, toys, blocks)
- NEVER reveal the answer directly — guide the student to discover it
- Use emoji sparingly (1-2 per response max) for warmth
- If the student is wrong, be gentle — "Almost!" or "Good try!" not "Wrong"
- Focus on building conceptual understanding, not memorization
- Keep total response under 80 words`;

const HINT_PROMPT_TEMPLATE = `The student is working on this math problem:
Question: {question}
Problem type: {problemType}
Difficulty level: {difficulty}/5

The student has already seen {hintsUsed} hint(s) so far.
{previousHints}

Generate the NEXT scaffolded hint. Each hint should get progressively more specific:
- Hint 1: Remind them of the general strategy (e.g., "Try counting on your fingers!")
- Hint 2: Break the problem into a simpler step (e.g., "Start with the bigger number first")
- Hint 3: Give a very specific nudge without revealing the answer (e.g., "5 plus 2 more... count: 6, 7...")

Remember: NEVER say the answer. Help them figure it out themselves.
Return ONLY the hint text, no labels or prefixes.`;

const EXPLANATION_CORRECT_TEMPLATE = `The student just answered this math problem CORRECTLY:
Question: {question}
Correct answer: {answer}
Student's answer: {studentAnswer}
Problem type: {problemType}

Give a brief, celebratory explanation of WHY the answer is correct. 
Reinforce the concept so they remember it next time.
Use a concrete example or visual if helpful.
Keep it under 50 words. Be enthusiastic but not over-the-top.
Return ONLY the explanation text.`;

const EXPLANATION_WRONG_TEMPLATE = `The student just answered this math problem INCORRECTLY:
Question: {question}
Correct answer: {answer}
Student's answer: {studentAnswer}
Problem type: {problemType}

Give a gentle, encouraging explanation of:
1. Why their answer isn't quite right (be kind!)
2. How to think about this problem correctly
3. A simple way to remember for next time

Do NOT just say the answer — explain the thinking process.
Keep it under 70 words. Be warm and supportive.
Return ONLY the explanation text.`;

/**
 * Fill template placeholders with actual values
 */
function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

/**
 * Extract text content from LLM response
 */
function extractContent(result: any): string {
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    const textPart = content.find((p: any) => p.type === "text");
    return textPart?.text?.trim() ?? "";
  }
  return "";
}

export const aiTutorRouter = router({
  /**
   * Generate a dynamic AI hint for a problem the student is stuck on.
   * Hints are scaffolded — each successive hint gets more specific.
   */
  getAIHint: protectedProcedure
    .input(z.object({
      problemId: z.number().int(),
      hintsUsed: z.number().int().min(0).max(10),
      previousHints: z.array(z.string()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const problem = await db.getProblemById(input.problemId);
      if (!problem) throw new Error("Problem not found");

      const previousHintsText = input.previousHints.length > 0
        ? `Previous hints shown:\n${input.previousHints.map((h, i) => `- Hint ${i + 1}: ${h}`).join("\n")}`
        : "No previous hints shown yet.";

      const userMessage = fillTemplate(HINT_PROMPT_TEMPLATE, {
        question: problem.questionText,
        problemType: problem.problemType,
        difficulty: String(problem.difficulty),
        hintsUsed: String(input.hintsUsed),
        previousHints: previousHintsText,
      });

      try {
        const result = await invokeLLM({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          maxTokens: 150,
        });

        const hint = extractContent(result);

        if (!hint) {
          // Fallback to static hints if AI fails
          const staticHints = problem.hintSteps as string[];
          const fallbackIdx = Math.min(input.hintsUsed, staticHints.length - 1);
          return {
            hint: staticHints[fallbackIdx] ?? "Try breaking the problem into smaller parts!",
            isAI: false,
          };
        }

        return { hint, isAI: true };
      } catch (error) {
        console.error("[AI Tutor] Hint generation failed:", error);
        // Graceful fallback to static hints
        const staticHints = problem.hintSteps as string[];
        const fallbackIdx = Math.min(input.hintsUsed, staticHints.length - 1);
        return {
          hint: staticHints[fallbackIdx] ?? "Try breaking the problem into smaller parts!",
          isAI: false,
        };
      }
    }),

  /**
   * Generate a dynamic AI explanation after the student answers.
   * Different tone for correct vs incorrect answers.
   */
  getAIExplanation: protectedProcedure
    .input(z.object({
      problemId: z.number().int(),
      studentAnswer: z.string(),
      isCorrect: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const problem = await db.getProblemById(input.problemId);
      if (!problem) throw new Error("Problem not found");

      const template = input.isCorrect
        ? EXPLANATION_CORRECT_TEMPLATE
        : EXPLANATION_WRONG_TEMPLATE;

      const userMessage = fillTemplate(template, {
        question: problem.questionText,
        answer: problem.correctAnswer,
        studentAnswer: input.studentAnswer,
        problemType: problem.problemType,
      });

      try {
        const result = await invokeLLM({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          maxTokens: 200,
        });

        const explanation = extractContent(result);

        if (!explanation) {
          return {
            explanation: problem.explanation ?? "Keep practicing — you're getting better!",
            isAI: false,
          };
        }

        return { explanation, isAI: true };
      } catch (error) {
        console.error("[AI Tutor] Explanation generation failed:", error);
        return {
          explanation: problem.explanation ?? "Keep practicing — you're getting better!",
          isAI: false,
        };
      }
    }),

  /**
   * Generate an encouraging message based on the student's session performance.
   * Called at the end of a practice session.
   */
  getSessionSummary: protectedProcedure
    .input(z.object({
      totalProblems: z.number().int(),
      correctAnswers: z.number().int(),
      hintsUsed: z.number().int(),
      streak: z.number().int(),
      skillsWorkedOn: z.array(z.string()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const accuracy = input.totalProblems > 0
        ? Math.round((input.correctAnswers / input.totalProblems) * 100)
        : 0;

      const userMessage = `A Grade 1-2 student just finished a math practice session:
- Got ${input.correctAnswers} out of ${input.totalProblems} correct (${accuracy}%)
- Used ${input.hintsUsed} hints
- Current streak: ${input.streak} days
- Skills practiced: ${input.skillsWorkedOn.join(", ") || "various math skills"}

Write a short, personalized encouragement message (under 60 words).
If they did great (80%+), celebrate their achievement.
If they struggled (<50%), be extra supportive and suggest they try easier problems or use more hints.
If they're in the middle, acknowledge their effort and encourage them to keep going.
Mention their streak if it's 3+ days.
Return ONLY the message text.`;

      try {
        const result = await invokeLLM({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          maxTokens: 120,
        });

        const summary = extractContent(result);
        return { summary: summary || getDefaultSummary(accuracy), isAI: !!summary };
      } catch (error) {
        console.error("[AI Tutor] Session summary generation failed:", error);
        return { summary: getDefaultSummary(accuracy), isAI: false };
      }
    }),

  /**
   * Submit feedback (thumbs up/down) on an AI response.
   * Simple, child-friendly — just a tap.
   */
  submitFeedback: protectedProcedure
    .input(z.object({
      sessionId: z.number().int().optional(),
      problemId: z.number().int().optional(),
      responseType: z.enum(["hint", "explanation", "session_summary"]),
      rating: z.enum(["up", "down"]),
      aiResponseText: z.string().optional(),
      comment: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await db.submitAIFeedback({
        studentId: ctx.user.id,
        sessionId: input.sessionId ?? null,
        problemId: input.problemId ?? null,
        responseType: input.responseType,
        rating: input.rating,
        aiResponseText: input.aiResponseText ?? null,
        comment: input.comment ?? null,
      });
      return { success: true, id: result?.id ?? null };
    }),

  /**
   * Get AI feedback quality stats (admin/parent view).
   */
  getFeedbackStats: protectedProcedure
    .query(async ({ ctx }) => {
      return db.getAIFeedbackStats();
    }),

  /**
   * Get feedback for a specific session.
   */
  getSessionFeedback: protectedProcedure
    .input(z.object({ sessionId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return db.getAIFeedbackForSession(input.sessionId);
    }),
});

function getDefaultSummary(accuracy: number): string {
  if (accuracy >= 90) return "Outstanding! You're a math superstar! Keep up the amazing work!";
  if (accuracy >= 70) return "Great job! You're getting stronger every day. Keep practicing!";
  if (accuracy >= 50) return "Good effort! Try using hints when you're stuck — they really help!";
  return "Don't worry! Every practice makes you stronger. Try again — you've got this!";
}
