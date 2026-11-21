/** Creates fictional teaching records through the running local HTTP app. */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../server/routers";
import type { MissionAction, MissionId, MissionView } from "../shared/missions";
import { requireDisposableMySql, describeFailure } from "./mysql-verification/guard";

const target = requireDisposableMySql();
assert(target.databaseName.startsWith("mathfuel_dev_"), "Create teaching records only in a mathfuel_dev_* database.");
const base = new URL(process.env.PUBLIC_APP_URL || "http://localhost:3000");
assert(["localhost", "127.0.0.1", "::1", "[::1]"].includes(base.hostname), "The teaching app must be local.");
assert(base.protocol === "http:" || base.protocol === "https:", "Use a local HTTP or HTTPS app.");
assert(!base.username && !base.password && !base.search && !base.hash, "Use a plain local app origin.");
const token = randomBytes(6).toString("hex");

function client() {
  let cookie = "";
  const cookieAttributes: string[] = [];
  return {
    cookieAttributes,
    rpc: createTRPCProxyClient<AppRouter>({
      links: [httpBatchLink({
        url: `${base.origin}/api/trpc`, transformer: superjson,
        async fetch(input, init) {
          const headers = new Headers(init?.headers);
          if (cookie) headers.set("cookie", cookie);
          const response = await fetch(input, { ...init, headers });
          for (const value of response.headers.getSetCookie()) {
            const [pair, ...attributes] = value.split(";");
            cookie = pair;
            cookieAttributes.push(attributes.join(";").trim());
          }
          return response;
        },
      })],
    }),
  };
}

function action(view: MissionView, kind: MissionAction["action"], answer?: string): MissionAction {
  return { runId: view.id, expectedRevision: view.revision, actionId: randomUUID(), action: kind, ...(answer === undefined ? {} : { answer }) };
}
function answer(view: MissionView) {
  const q = view.question!;
  return q.kind === "make-ten" || q.kind === "bridge-gap" ? 10 - q.a : q.kind === "bridge-rest" ? q.b - (10 - q.a) : q.a + q.b;
}

async function main() {
  const learner = client(); const parent = client();
  const credentials: Array<{ role: string; email: string; password: string }> = [];
  const actors: Record<string, number> = {};
  for (const [role, actor] of [["learner", learner], ["parent", parent]] as const) {
    const email = `mysql-demo-${role}-${token}@example.test`;
    const password = randomBytes(24).toString("base64url");
    credentials.push({ role, email, password });
    const registered = await actor.rpc.auth.register.mutate({ email, password, name: role === "learner" ? "Demo Learner" : "Demo Parent", userType: role === "learner" ? "student" : "parent", ...(role === "learner" ? { gradeLevel: 1 } : {}) });
    assert(registered.user?.id);
    assert(!("passwordHash" in registered.user));
    await actor.rpc.auth.login.mutate({ email, password });
    const user = await actor.rpc.auth.me.query();
    assert.equal(user?.id, registered.user.id);
    actors[role] = user!.id;
    if (base.protocol === "http:") {
      assert(actor.cookieAttributes.some(value => /SameSite=Lax/i.test(value)), "Local HTTP login must issue a browser-compatible cookie.");
    }
  }
  const invitation = await learner.rpc.parent.generateInviteCode.mutate();
  const linked = await parent.rpc.parent.redeemInviteCode.mutate({ code: invitation.code });
  assert.equal(linked.studentId, actors.learner);
  const results = [];
  for (const missionId of ["make-ten", "bridge-ten"] as const satisfies readonly MissionId[]) {
    let view = await learner.rpc.mission.start.mutate({ missionId });
    if (missionId === "make-ten") view = await learner.rpc.mission.act.mutate(action(view, "hint"));
    else view = await learner.rpc.mission.act.mutate(action(view, "answer", String(answer(view) + 1)));
    const reloaded = await learner.rpc.mission.getRun.query({ runId: view.id });
    assert.deepEqual(reloaded, view);
    while (view.status !== "completed") {
      if (!view.question!.solved) view = await learner.rpc.mission.act.mutate(action(view, "answer", String(answer(view))));
      view = await learner.rpc.mission.act.mutate(action(view, "next"));
    }
    assert.deepEqual(await learner.rpc.mission.getRun.query({ runId: view.id }), view);
    results.push(view.summary!);
  }
  const progress = await parent.rpc.parent.getMissionProgress.query({ childId: actors.learner });
  for (const result of results) assert.deepEqual(progress.missions.find(m => m.id === result.missionId)?.latest, result);
  assert.deepEqual(results.map(r => [r.independent, r.firstTry, r.hintsUsed, r.wrongAnswers]), [[4, 5, 1, 0], [4, 4, 0, 1]]);
  let active = await learner.rpc.mission.start.mutate({ missionId: "make-ten" });
  active = await learner.rpc.mission.act.mutate(action(active, "hint"));
  assert.equal(active.status, "in_progress");
  assert.deepEqual(await learner.rpc.mission.getRun.query({ runId: active.id }), active);
  await mkdir("tmp/mysql-lab-private", { recursive: true, mode: 0o700 });
  await writeFile("tmp/mysql-lab-private/demo-credentials.json", JSON.stringify({ baseUrl: base.origin, credentials }, null, 2) + "\n", { mode: 0o600 });
  const report = { databaseName: target.databaseName, baseUrl: base.origin, verifiedAt: new Date().toISOString(), learnerId: actors.learner, parentId: actors.parent, results, activeRunId: active.id, checks: ["real HTTP signup and password login", "session cookie authentication", "invite-code parent linking", "hinted Make Ten result", "corrected Bridge Through Ten result", "saved-step and completion reloads", "linked-parent results", "new incomplete run remains resumable"], browserUiVerified: false };
  await writeFile("tmp/mysql-lab-http-report.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(describeFailure(error)); process.exitCode = 1; });
