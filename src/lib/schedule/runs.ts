import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { type Run, run } from "@/lib/db/schema";

/** Most recent pipeline runs, newest first — for the dashboard run log. */
export async function listRuns(limit = 10): Promise<Run[]> {
  return db.select().from(run).orderBy(desc(run.startedAt)).limit(limit);
}
