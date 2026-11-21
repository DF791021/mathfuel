import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";

const database = vi.hoisted(() => ({ getDb: vi.fn(() => { throw new Error("Discovery content must not query account data"); }) }));
vi.mock("./db", () => database);
import { discoveryWorkshopRouter } from "./routers/discoveryWorkshop";
import { mysqlWorkshopTutorial } from "./content/mysqlWorkshop";

function account(role: User["role"], userType: User["userType"]): User {
  return {
    id: 91, openId: "workshop-fixture", name: "Workshop test", email: "workshop@example.test",
    role, userType, passwordHash: null, loginMethod: "email", avatarUrl: null, gradeLevel: null,
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
}
function context(user: User | null = null) {
  return {
    req: { headers: {}, protocol: "https" },
    res: { setHeader: vi.fn() }, user,
  } as unknown as TrpcContext;
}

describe("discovery workshop learning puzzle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lets a guest unlock the authored lesson and normalizes the word clue", async () => {
    const ctx = context();
    const result = await discoveryWorkshopRouter.createCaller(ctx).getTutorial({ answer: 4, word: "  data  " });
    expect(result).toEqual(mysqlWorkshopTutorial);
    expect(ctx.res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(database.getDb).not.toHaveBeenCalled();
  });

  it.each(["student", "parent", "teacher", "admin"] as const)(
    "offers the same lesson to a signed-in %s without granting privileges", async userType => {
      const user = account("user", userType);
      const result = await discoveryWorkshopRouter.createCaller(context(user)).getTutorial({ answer: 4, word: "DATA" });
      expect(result).toEqual(mysqlWorkshopTutorial);
      expect(user.role).toBe("user");
      expect(database.getDb).not.toHaveBeenCalled();
    },
  );

  it("also lets an existing administrator use the public puzzle", async () => {
    const result = await discoveryWorkshopRouter.createCaller(context(account("admin", "admin")))
      .getTutorial({ answer: 4, word: "DATA" });
    expect(result).toEqual(mysqlWorkshopTutorial);
    expect(database.getDb).not.toHaveBeenCalled();
  });

  it.each([
    { answer: 3, word: "DATA" },
    { answer: 4, word: "OTHER" },
    { answer: 4 },
    { word: "DATA" },
    { answer: "4", word: "DATA" },
    { answer: 4, word: "DATA", sql: "SELECT * FROM users" },
    undefined,
    null,
  ])("rejects wrong or missing clues and any additional query input", async input => {
    const ctx = context();
    await expect(discoveryWorkshopRouter.createCaller(ctx).getTutorial(input as never))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(ctx.res.setHeader).not.toHaveBeenCalled();
    expect(database.getDb).not.toHaveBeenCalled();
  });
});
