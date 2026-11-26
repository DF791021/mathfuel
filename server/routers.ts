import { systemRouter } from "./_core/systemRouter.js";
import { router } from "./_core/trpc.js";
import { adminSettingsRouter } from "./routers/adminSettings.js";
import { mathContentRouter } from "./routers/mathContent.js";
import { practiceRouter } from "./routers/practice.js";
import { studentRouter } from "./routers/student.js";
import { parentRouter } from "./routers/parent.js";
import { aiTutorRouter } from "./routers/aiTutor.js";
import { customAuthRouter } from "./routers/customAuth.js";

export const appRouter = router({
  system: systemRouter,
  adminSettings: adminSettingsRouter,
  mathContent: mathContentRouter,
  practice: practiceRouter,
  student: studentRouter,
  parent: parentRouter,
  aiTutor: aiTutorRouter,
  auth: customAuthRouter,
});

export type AppRouter = typeof appRouter;
