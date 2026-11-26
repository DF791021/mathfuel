import { router, protectedProcedure } from "../_core/trpc.js";
import { z } from "zod";
import * as db from "../db.js";
import { TRPCError } from "@trpc/server";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const adminSettingsRouter = router({
  getFeatureFlags: adminProcedure.query(async () => {
    return db.getAllFeatureFlags();
  }),

  toggleFeatureFlag: adminProcedure
    .input(z.object({ name: z.string(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await db.setFeatureFlag(input.name, input.enabled, ctx.user.name ?? "admin");
      return { success: true };
    }),

  getSettings: adminProcedure.query(async () => {
    return db.getAllAdminSettings();
  }),

  setSetting: adminProcedure
    .input(z.object({
      key: z.string(),
      value: z.any(),
      type: z.enum(["boolean", "string", "number", "json"]),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.setAdminSetting(input.key, input.value, input.type, input.description ?? "", ctx.user.id);
      return { success: true };
    }),

  getAuditLogs: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(500).default(100) }).optional())
    .query(async ({ input }) => {
      return db.getAuditLogs(input?.limit ?? 100);
    }),
});
