import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Single shared SQLite connection. In dev, Next.js hot-reloads modules, which
 * would otherwise open a new connection on every change; we cache it on
 * `globalThis` to keep exactly one.
 */
const globalForDb = globalThis as unknown as {
  __jobscoutDb?: Database.Database;
};

const sqlite =
  globalForDb.__jobscoutDb ??
  (() => {
    const db = new Database(env.DATABASE_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    return db;
  })();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__jobscoutDb = sqlite;
}

export const db = drizzle(sqlite, { schema });
export { schema };
