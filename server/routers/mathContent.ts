import { publicProcedure, protectedProcedure, router } from "../_core/trpc.js";
import { z } from "zod";
import * as db from "../db.js";

export const mathContentRouter = router({
  // Get all domains for a grade level
  getDomains: publicProcedure
    .input(z.object({ gradeLevel: z.number().int().min(1).max(12) }))
    .query(async ({ input }) => {
      return db.getDomainsByGrade(input.gradeLevel);
    }),

  // Get all domains
  getAllDomains: publicProcedure.query(async () => {
    return db.getAllDomains();
  }),

  // Get skills for a domain
  getSkillsByDomain: publicProcedure
    .input(z.object({ domainId: z.number().int() }))
    .query(async ({ input }) => {
      return db.getSkillsByDomain(input.domainId);
    }),

  // Get all skills for a grade
  getSkillsByGrade: publicProcedure
    .input(z.object({ gradeLevel: z.number().int().min(1).max(12) }))
    .query(async ({ input }) => {
      return db.getSkillsByGrade(input.gradeLevel);
    }),

  // Get a single skill
  getSkill: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      return db.getSkillById(input.id);
    }),

  // Get problems for a skill
  getProblemsBySkill: publicProcedure
    .input(z.object({
      skillId: z.number().int(),
      difficulty: z.number().int().min(1).max(5).optional(),
    }))
    .query(async ({ input }) => {
      return db.getProblemsBySkill(input.skillId, input.difficulty);
    }),
});
