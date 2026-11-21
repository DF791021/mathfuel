import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireDisposableMySql } from "../scripts/mysql-verification/guard";

describe("live MySQL verification write guard", () => {
  beforeEach(() => {
    vi.stubEnv("MATHFUEL_TEST_DATABASE_NAME", "mathfuel_test_lab");
    vi.stubEnv("DATABASE_URL", "mysql://test:unused@127.0.0.1:3307/mathfuel_test_lab");
    vi.stubEnv("JWT_SECRET", "local-test-secret-of-at-least-32-characters");
    vi.stubEnv("VITE_APP_ID", "local-mathfuel-test");
    vi.stubEnv("NODE_ENV", "test");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("allows the explicitly named loopback test database", () => {
    expect(requireDisposableMySql()).toMatchObject({ databaseName: "mathfuel_test_lab", host: "127.0.0.1", port: 3307 });
  });

  it.each([
    "mysql://test:unused@database.example/mathfuel_test_lab",
    "mysql://test:unused@127.0.0.1/production",
    "mysql://test:unused@127.0.0.1/mathfuel_test_lab?host=database.example",
    "mysql://test:unused@127.0.0.1/mathfuel_test_lab?database=production",
    "mysql://test:unused@127.0.0.1/mathfuel_test_lab?socketPath=/tmp/mysql.sock",
    "mysql://test:unused@127.0.0.1/mathfuel_test_lab#override",
  ])("rejects an unsafe or overridden connection target", url => {
    vi.stubEnv("DATABASE_URL", url);
    expect(() => requireDisposableMySql()).toThrow();
  });

  it("requires explicit disposable-database opt-in", () => {
    vi.stubEnv("MATHFUEL_TEST_DATABASE_NAME", "");
    expect(() => requireDisposableMySql()).toThrow(/MATHFUEL_TEST_DATABASE_NAME/);
  });

  it("refuses production mode even with a test-looking database name", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => requireDisposableMySql()).toThrow(/production/);
  });
});
