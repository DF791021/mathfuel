import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import type { User } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), upsert: vi.fn(), getUser: vi.fn(), sendEmail: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb, upsertUser: mocks.upsert, getUserByOpenId: mocks.getUser }));
vi.mock("./_core/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("./_core/env", () => ({ ENV: { cookieSecret: "test-secret-at-least-thirty-two-characters-long", appId: "mathfuel-test" } }));
import { customAuthRouter } from "./routers/customAuth";

const account = (passwordHash: string | null = null): User => ({
  id: 7, openId: "existing-parent", name: "Test parent", email: "parent@example.test", loginMethod: "google", passwordHash,
  role: "user", userType: "parent", avatarUrl: null, gradeLevel: null,
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
});

describe("authentication boundaries around learner and parent accounts", () => {
  let rows: User[];
  let update: ReturnType<typeof vi.fn>;
  let values: ReturnType<typeof vi.fn>;
  let cookie: ReturnType<typeof vi.fn>;
  let context: TrpcContext;
  beforeEach(() => {
    vi.clearAllMocks(); rows = [account()];
    update = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) }));
    values = vi.fn().mockResolvedValue(undefined); cookie = vi.fn();
    mocks.getDb.mockResolvedValue({
      select: () => ({ from: () => ({ where: () => ({ limit: async () => rows }) }) }),
      update, insert: () => ({ values }),
    });
    mocks.getUser.mockImplementation(async () => rows[0]);
    mocks.sendEmail.mockResolvedValue(true);
    context = { req: { headers: { origin: "https://attacker.example", referer: "https://attacker.example/steal" }, protocol: "https" }, res: { cookie, clearCookie: vi.fn() }, user: null } as unknown as TrpcContext;
    vi.stubEnv("PUBLIC_APP_URL", "https://mathfuel.org");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("blocks setting an OAuth user's password through anonymous signup", async () => {
    const caller = customAuthRouter.createCaller(context);
    await expect(caller.register({ email: "parent@example.test", name: "Someone else", password: "attacker-password", userType: "parent" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(update).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(cookie).not.toHaveBeenCalled();
  });

  it("also rejects duplicate password accounts without replacing their credentials", async () => {
    rows = [account("existing-hash")];
    await expect(customAuthRouter.createCaller(context).register({ email: "parent@example.test", name: "Someone else", password: "attacker-password", userType: "student" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(update).not.toHaveBeenCalled();
    expect(cookie).not.toHaveBeenCalled();
  });

  it("omits password hashes from the current-user response", async () => {
    const result = await customAuthRouter.createCaller({ ...context, user: account("private-hash") }).me();
    expect(result).toMatchObject({ id: 7, userType: "parent" });
    expect(result).not.toHaveProperty("passwordHash");
    expect(await customAuthRouter.createCaller(context).me()).toBeNull();
  });

  it("omits password hashes from a successful login response", async () => {
    rows = [{ ...account(await bcrypt.hash("verified-password", 4)), loginMethod: "email" }];
    const result = await customAuthRouter.createCaller(context).login({ email: "parent@example.test", password: "verified-password" });
    expect(result.success).toBe(true);
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(cookie).toHaveBeenCalledOnce();
  });

  it("rejects unavailable account storage instead of pretending registration succeeded", async () => {
    mocks.getDb.mockResolvedValue(null);
    await expect(customAuthRouter.createCaller(context).register({ email: "new@example.test", name: "New learner", password: "new-password", userType: "student" })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    expect(cookie).not.toHaveBeenCalled();
  });

  it("keeps recovery tokens on the configured application regardless of request headers", async () => {
    await customAuthRouter.createCaller(context).forgotPassword({ email: "parent@example.test" });
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    const html = mocks.sendEmail.mock.calls[0][0].html as string;
    expect(html).toContain("https://mathfuel.org/reset-password?token=");
    expect(html).not.toContain("attacker.example");
    expect(values).toHaveBeenCalledOnce();
  });

  it("uses an explicit staging application URL for recovery when configured", async () => {
    vi.stubEnv("PUBLIC_APP_URL", "https://staging.mathfuel.example");
    await customAuthRouter.createCaller(context).forgotPassword({ email: "parent@example.test" });
    expect(mocks.sendEmail.mock.calls[0][0].html).toContain("https://staging.mathfuel.example/reset-password?token=");
  });
});
