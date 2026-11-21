import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PoolConnection, QueryError } from "mysql2";

const mocks = vi.hoisted(() => ({ createPool: vi.fn() }));
vi.mock("mysql2", () => ({ createPool: mocks.createPool }));
import { createUtcMysqlPool } from "./_core/mysql";

describe("MySQL connection time zone initialization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("waits for successful UTC initialization before handing a connection to application queries", () => {
    let finishInitialization!: (error: QueryError | null) => void;
    const connection = {
      query: vi.fn((_sql: string, callback: typeof finishInitialization) => { finishInitialization = callback; }),
      destroy: vi.fn(),
    } as unknown as PoolConnection;
    mocks.createPool.mockReturnValue({ getConnection: (callback: (error: null, connection: PoolConnection) => void) => callback(null, connection) });
    const pool = createUtcMysqlPool("mysql://unused@localhost/test");
    const acquired = vi.fn();
    pool.getConnection(acquired);
    expect(acquired).not.toHaveBeenCalled();
    finishInitialization(null);
    expect(acquired).toHaveBeenCalledWith(null, connection);
    pool.getConnection(acquired);
    expect(connection.query).toHaveBeenCalledTimes(1);
    expect(mocks.createPool).toHaveBeenCalledWith({ uri: "mysql://unused@localhost/test", timezone: "Z" });
  });

  it("destroys a session whose UTC initialization fails and reports the failure to its caller", () => {
    const failure = Object.assign(new Error("Time zone initialization failed"), { code: "ER_TEST" }) as QueryError;
    const connection = {
      query: vi.fn((_sql: string, callback: (error: QueryError) => void) => callback(failure)),
      destroy: vi.fn(),
    } as unknown as PoolConnection;
    mocks.createPool.mockReturnValue({ getConnection: (callback: (error: null, connection: PoolConnection) => void) => callback(null, connection) });
    const acquired = vi.fn();
    createUtcMysqlPool("mysql://unused@localhost/test").getConnection(acquired);
    expect(connection.destroy).toHaveBeenCalledTimes(1);
    expect(acquired).toHaveBeenCalledWith(failure, connection);
    expect(acquired).not.toHaveBeenCalledWith(null, connection);
  });
});
