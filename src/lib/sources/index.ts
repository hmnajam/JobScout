import { db } from "@/lib/db";
import { job } from "@/lib/db/schema";
import { adzuna } from "./adzuna";
import { atsBoards } from "./ats";
import { jsearch } from "./jsearch";
import { remoteok } from "./remoteok";
import { remotive } from "./remotive";
import { makeDedupKey, type JobSource, type SearchQuery } from "./types";

export type { JobSource, NormalizedJob, SearchQuery } from "./types";
export { makeDedupKey } from "./types";

/** All sources, keyless first. Order affects which source "wins" a dedup tie. */
export const SOURCES: JobSource[] = [
  remotive,
  remoteok,
  atsBoards,
  adzuna,
  jsearch,
];

export type IngestResult = {
  /** Total normalized postings returned across sources (before dedup). */
  fetched: number;
  /** Rows actually inserted (new, non-duplicate). */
  added: number;
  /** Ids of the newly inserted rows (for incremental scoring). */
  addedIds: number[];
  /** Per-source fetched counts, e.g. { remotive: 12 }. */
  sourceCounts: Record<string, number>;
  /** Human-readable errors, one per failed source. */
  errors: string[];
};

/**
 * Run every configured source for `query`, dedup, and insert new jobs.
 *
 * Best-effort: a source that throws is logged to `errors` and skipped; others
 * still complete. Dedup happens both in-memory (across sources this run) and at
 * the DB via the unique index on `dedupKey` (across runs).
 */
export async function ingest(query: SearchQuery): Promise<IngestResult> {
  const sourceCounts: Record<string, number> = {};
  const errors: string[] = [];
  const byKey = new Map<string, (typeof job.$inferInsert)>();

  const active = SOURCES.filter((s) => s.isConfigured());
  const settled = await Promise.allSettled(
    active.map(async (s) => ({ slug: s.slug, jobs: await s.fetch(query) })),
  );

  let fetched = 0;
  settled.forEach((r, i) => {
    const src = active[i];
    if (r.status === "rejected") {
      errors.push(`${src.name}: ${String(r.reason)}`);
      return;
    }
    sourceCounts[r.value.slug] = r.value.jobs.length;
    fetched += r.value.jobs.length;
    for (const n of r.value.jobs) {
      if (!n.url || !n.title || !n.company) continue;
      const dedupKey = makeDedupKey(n);
      if (byKey.has(dedupKey)) continue; // earlier source wins
      byKey.set(dedupKey, {
        title: n.title,
        company: n.company,
        location: n.location,
        remote: n.remote,
        salaryMin: n.salaryMin,
        salaryMax: n.salaryMax,
        currency: n.currency,
        url: n.url,
        description: n.description,
        source: n.source,
        sourceId: n.sourceId,
        dedupKey,
      });
    }
  });

  const rows = [...byKey.values()];
  let addedIds: number[] = [];
  if (rows.length) {
    // onConflictDoNothing against the unique dedupKey index handles cross-run dupes.
    const inserted = await db
      .insert(job)
      .values(rows)
      .onConflictDoNothing({ target: job.dedupKey })
      .returning({ id: job.id });
    addedIds = inserted.map((r) => r.id);
  }

  return { fetched, added: addedIds.length, addedIds, sourceCounts, errors };
}
