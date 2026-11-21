import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { mysqlWorkshopTutorial } from "../content/mysqlWorkshop";

/** A learning puzzle opens an authored lesson containing fictional lab rows.
 * This is public product discovery, not authentication or a SQL execution API. */
export const discoveryWorkshopRouter = router({
  getTutorial: publicProcedure.input(z.object({
    answer: z.literal(4),
    word: z.string().trim().toUpperCase().pipe(z.literal("DATA")),
  }).strict()).query(({ ctx }) => {
    ctx.res.setHeader("Cache-Control", "no-store");
    return mysqlWorkshopTutorial;
  }),
});
