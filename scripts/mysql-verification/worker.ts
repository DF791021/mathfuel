import assert from "node:assert/strict";
import { createInterface } from "node:readline";
import type { Request, Response } from "express";
import type { Pool, RowDataPacket } from "mysql2";
import type { MissionAction, MissionId } from "../../shared/missions";
import { describeFailure, requireDisposableMySql } from "./guard";

const PREFIX = "MYSQL_VERIFY:";
const emit = (message: unknown) => process.stdout.write(`${PREFIX}${JSON.stringify(message)}\n`);
const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
let pool: Pool | undefined;

type Command = {
  id: number;
  operation: "start" | "get" | "act" | "parentProgress" | "close";
  missionId?: MissionId;
  runId?: string;
  action?: MissionAction;
  childId?: number;
};

try {
  requireDisposableMySql();
  const iterator = lines[Symbol.asyncIterator]();
  const first = await iterator.next();
  assert(!first.done, "Worker initialization is missing.");
  const init = JSON.parse(first.value) as { cookie: string; expectedUserId: number };
  assert(typeof init.cookie === "string" && init.cookie.length > 0, "A real session cookie is required.");
  const [{ appRouter }, { createContext }, { getDb }] = await Promise.all([
    import("../../server/routers"), import("../../server/_core/context"), import("../../server/db"),
  ]);
  const req = { headers: { cookie: init.cookie }, protocol: "https" } as Request;
  const res = { cookie() {}, clearCookie() {} } as unknown as Response;
  // Exercise the real JWT verifier and database-backed user lookup.
  const context = await createContext({ req, res, info: {} as never });
  assert.equal(context.user?.id, init.expectedUserId, "Fresh-process authentication selected the wrong user.");
  const caller = appRouter.createCaller(context);
  const database = await getDb();
  assert(database, "The application did not open its MySQL pool.");
  pool = (database as unknown as { $client: Pool }).$client;
  const [connections] = await pool.promise().query<RowDataPacket[]>("SELECT CONNECTION_ID() AS connectionId, @@session.time_zone AS sessionTimeZone");
  assert.equal(connections[0].sessionTimeZone, "+00:00", "Every application worker connection must use UTC.");
  emit({ event: "ready", connectionId: Number(connections[0].connectionId), userId: context.user.id });
  for (;;) {
    const next = await iterator.next();
    if (next.done) break;
    const command = JSON.parse(next.value) as Command;
    if (command.operation === "close") {
      emit({ event: "result", id: command.id, ok: true, value: null });
      break;
    }
    emit({ event: "calling", id: command.id });
    try {
      let value: unknown;
      switch (command.operation) {
        case "start": value = await caller.mission.start({ missionId: command.missionId! }); break;
        case "get": value = await caller.mission.getRun({ runId: command.runId! }); break;
        case "act": value = await caller.mission.act(command.action!); break;
        case "parentProgress": value = await caller.parent.getMissionProgress({ childId: command.childId! }); break;
        default: throw new Error("Unknown verification worker operation.");
      }
      emit({ event: "result", id: command.id, ok: true, value });
    } catch (error) {
      emit({ event: "result", id: command.id, ok: false, error: describeFailure(error) });
    }
  }
} catch (error) {
  emit({ event: "fatal", error: describeFailure(error) });
  process.exitCode = 1;
} finally {
  if (pool) await pool.promise().end();
  lines.close();
  process.stdin.pause();
}
