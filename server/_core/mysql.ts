import { createPool, type PoolConnection } from "mysql2";

/** Drizzle serializes TIMESTAMP dates as UTC strings, so every server session
 * must also use UTC. The driver's timezone option alone cannot ensure that. */
export function createUtcMysqlPool(connectionString: string) {
  const pool = createPool({ uri: connectionString, timezone: "Z" });
  const acquire = pool.getConnection.bind(pool);
  const initialized = new WeakSet<PoolConnection>();

  // Gate the public acquisition callback: application queries cannot be queued
  // until this physical connection has successfully initialized its time zone.
  // Reused connections need no additional SET; newly opened ones each get it.
  pool.getConnection = callback => {
    acquire((error, connection) => {
      if (error) { callback(error, connection); return; }
      if (initialized.has(connection)) { callback(null, connection); return; }
      connection.query("SET SESSION time_zone = '+00:00'", initializationError => {
        if (initializationError) {
          // Never let the application use a session with ambiguous timestamps.
          connection.destroy();
          callback(initializationError, connection);
          return;
        }
        initialized.add(connection);
        callback(null, connection);
      });
    });
  };
  return pool;
}
