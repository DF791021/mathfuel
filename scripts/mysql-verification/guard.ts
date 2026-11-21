import assert from "node:assert/strict";

/** These write tests are deliberately limited to an explicitly named local lab. */
export function requireDisposableMySql() {
  const databaseName = process.env.MATHFUEL_TEST_DATABASE_NAME;
  assert(databaseName && /^mathfuel_(?:test|dev)_[a-z0-9_]+$/.test(databaseName),
    "Set MATHFUEL_TEST_DATABASE_NAME to an explicit mathfuel_test_* or mathfuel_dev_* database name.");
  assert(process.env.NODE_ENV !== "production", "The MySQL verification harness refuses NODE_ENV=production.");
  const connectionString = process.env.DATABASE_URL;
  assert(connectionString, "DATABASE_URL is required.");
  let url: URL;
  try { url = new URL(connectionString); } catch { throw new Error("DATABASE_URL must be a valid local MySQL URL."); }
  assert(url.protocol === "mysql:", "The verification harness requires the mysql: protocol.");
  // mysql2 applies query parameters after host/path parsing; allowing them
  // would let ?host=... or ?database=... override the target we validated.
  assert(!url.search && !url.hash, "Database URL query options and fragments are not allowed in this local verification harness.");
  assert(["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname), "The verification harness refuses non-loopback database hosts.");
  assert(decodeURIComponent(url.pathname.slice(1)) === databaseName,
    "DATABASE_URL must select exactly MATHFUEL_TEST_DATABASE_NAME.");
  assert((process.env.JWT_SECRET ?? "").length >= 32, "Set a local JWT_SECRET of at least 32 characters.");
  assert(process.env.VITE_APP_ID?.trim(), "Set a nonempty VITE_APP_ID for local JWT authentication.");
  return { connectionString, databaseName, host: url.hostname, port: Number(url.port || 3306) };
}

export function describeFailure(error: unknown) {
  const candidate = error as { code?: unknown; name?: unknown; message?: unknown };
  return {
    code: typeof candidate?.code === "string" ? candidate.code : typeof candidate?.name === "string" ? candidate.name : "ERROR",
    // Keep driver query parameters and stacks out of the shareable report.
    message: typeof candidate?.message === "string" ? candidate.message.split("\n")[0].slice(0, 500) : "Verification failed.",
  };
}
