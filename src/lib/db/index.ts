import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Single shared Postgres connection pool. In dev, Next.js hot-reloads modules,
 * which would otherwise open a new pool on every change; we cache it on
 * `globalThis` to keep exactly one. Works both locally and on Vercel (point
 * `DATABASE_URL` at a hosted Postgres such as Neon).
 */
const globalForDb = globalThis as unknown as {
  __jobscoutPool?: Pool;
};

const pool =
  globalForDb.__jobscoutPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    // Neon and most hosted Postgres require TLS.
    ssl: env.DATABASE_URL.includes("localhost")
      ? undefined
      : { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__jobscoutPool = pool;
}

export const db = drizzle(pool, { schema });
export { schema };
