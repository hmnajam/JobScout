import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { job as jobTable, run } from "@/lib/db/schema";
import { matchJobs, queryFromProfile } from "@/lib/matching";
import { getProfile } from "@/lib/profile/store";
import { ingest } from "@/lib/sources";

export type PipelineTrigger = "manual" | "cron";

export type PipelineResult = {
  runId: number;
  fetched: number;
  added: number;
  scored: number;
  sourceCounts: Record<string, number>;
  errors: string[];
};

/**
 * The full search pipeline: fetch from sources → dedup/insert → score new jobs →
 * persist matches. Everything is logged to a `run` row. Shared by the manual
 * "Run search" action and the scheduled worker (Phase 8).
 *
 * Best-effort: source failures are collected into the run's `errors` and never
 * abort the run.
 */
export async function runPipeline(
  trigger: PipelineTrigger = "manual",
): Promise<PipelineResult> {
  const [runRow] = await db.insert(run).values({ trigger }).returning();
  const errors: string[] = [];

  const profile = await getProfile();
  if (!profile) {
    const msg = "No profile configured — set job criteria in Settings first.";
    await finishRun(runRow.id, {
      errors: [msg],
    });
    return {
      runId: runRow.id,
      fetched: 0,
      added: 0,
      scored: 0,
      sourceCounts: {},
      errors: [msg],
    };
  }

  // 1-2. Fetch + dedup + insert.
  const query = queryFromProfile(profile);
  const ingestResult = await ingest(query);
  errors.push(...ingestResult.errors);

  // 3-4. Score only the jobs added this run (incremental, cheap).
  let scored = 0;
  try {
    if (ingestResult.added > 0) {
      const newJobs = await db
        .select()
        .from(jobTable)
        .where(inArray(jobTable.id, ingestResult.addedIds));
      const result = await matchJobs(newJobs, profile);
      scored = result.scored;
    }
  } catch (err) {
    errors.push(`Scoring failed: ${err instanceof Error ? err.message : err}`);
  }

  await finishRun(runRow.id, {
    sourceCounts: ingestResult.sourceCounts,
    fetched: ingestResult.fetched,
    added: ingestResult.added,
    scored,
    errors,
  });

  return {
    runId: runRow.id,
    fetched: ingestResult.fetched,
    added: ingestResult.added,
    scored,
    sourceCounts: ingestResult.sourceCounts,
    errors,
  };
}

async function finishRun(
  id: number,
  fields: Partial<{
    sourceCounts: Record<string, number>;
    fetched: number;
    added: number;
    scored: number;
    errors: string[];
  }>,
): Promise<void> {
  await db
    .update(run)
    .set({ ...fields, finishedAt: new Date() })
    .where(eq(run.id, id));
}
