import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import Stripe from "stripe";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

let server: ReturnType<typeof createServer>;
let origin: string;

beforeAll(async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
  const { default: app } = await import("../../api/index");
  server = createServer(app).listen(0, "127.0.0.1");
  await once(server, "listening");
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  if (server) await new Promise<void>(resolve => server.close(() => resolve()));
});

describe("MathFuel API entry point", () => {
  it("serves anonymous tRPC requests without Stripe credentials", async () => {
    const response = await fetch(`${origin}/api/trpc/auth.me?batch=1`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual([{ result: { data: { json: null } } }]);
  });

  it("keeps unknown API requests out of the SPA fallback", async () => {
    const response = await fetch(`${origin}/api/missing`);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "API route not found" });
  });

  it("allows only the configured Stripe webhook to use the signed raw body", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    const url = `${origin}/api/stripe/webhook`;
    const secret = "whsec_fictional";
    const body = '{ "id": "evt_test_mathfuel", "type": "checkout.session.completed" }';
    const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret });
    const send = (payload: string) => fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "stripe-signature": signature },
      body: payload,
    });

    expect((await send(body)).status).toBe(503);
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fictional");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret);
    const accepted = await send(body);
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toEqual({ verified: true });
    expect((await send(JSON.stringify(JSON.parse(body)))).status).toBe(400);
  });

  it("keeps password hashes private and restricts direct child linking", async () => {
    const { appRouter } = await import("../routers");
    const now = new Date();
    const caller = appRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: {
        id: 1, openId: "fictional-parent", name: "Parent", email: "parent@example.invalid",
        loginMethod: "email", passwordHash: "fixture-hash", role: "user", userType: "parent",
        avatarUrl: null, gradeLevel: null, createdAt: now, updatedAt: now, lastSignedIn: now,
      },
    });
    expect(await caller.auth.me()).not.toHaveProperty("passwordHash");
    await expect(caller.parent.linkChild({ childId: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
