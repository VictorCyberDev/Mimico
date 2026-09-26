import { Pool } from "pg";

/**
 * Shared pool for the app's own tables. Separate from the pool Better Auth
 * owns so a slow query here can't starve session lookups.
 */
let pool: Pool | null = null;

export function db(): Pool {
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return pool;
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}
