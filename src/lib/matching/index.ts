import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { type Job, job, match, type Profile } from "@/lib/db/schema";
import { getMasterResume } from "@/lib/resume/store";
import type { SearchQuery } from "@/lib/sources";
import { hardFilter } from "./filter";
import { scoreJobs } from "./score";

export type { FilterResult } from "./filter";
export { hardFilter } from "./filter";
export type { JobScore, ScoredJob } from "./score";
export { scoreJobs } from "./score";

export type MatchResult = {
  /** Jobs considered (input). */
  considered: number;
  /** Removed by the hard filter. */
  filtered: number;
  /** Scored by the LLM and persisted as matches. */
  scored: number;
};

/** Derive a source `SearchQuery` from the profile's criteria. */
export function queryFromProfile(profile: Profile, limit = 25): SearchQuery {
  return {
    roles: profile.roleTargets,
    locations: profile.locations,
    remoteOnly: profile.remotePref === "remote",
    limit,
  };
}

/**
 * Score a set of jobs against the profile and persist `match` rows.
 *
 * Runs the hard filter first, then LLM scoring on survivors. Existing matches
 * for the same jobs are replaced so re-running is idempotent.
 */
export async function matchJobs(
  jobs: Job[],
  profile: Profile,
): Promise<MatchResult> {
  const { passed } = hardFilter(jobs, profile);
  if (!passed.length) {
    return { considered: jobs.length, filtered: jobs.length, scored: 0 };
  }

  const resume = await getMasterResume();
  const scored = await scoreJobs(passed, profile, resume?.content ?? null);

  const jobIds = scored.map((s) => s.job.id);
  await db.transaction(async (tx) => {
    // Replace any prior scores for these jobs so re-runs don't accumulate.
    await tx.delete(match).where(inArray(match.jobId, jobIds));
    if (scored.length) {
      await tx.insert(match).values(
        scored.map((s) => ({
          jobId: s.job.id,
          score: s.score.score,
          reasons: s.score.reasons,
          concerns: s.score.concerns,
          model: s.model,
        })),
      );
    }
  });

  return {
    considered: jobs.length,
    filtered: jobs.length - passed.length,
    scored: scored.length,
  };
}

/** Score every job that has no match row yet. */
export async function matchUnscored(profile: Profile): Promise<MatchResult> {
  const scoredIds = await db.select({ id: match.jobId }).from(match);
  const scoredSet = new Set(scoredIds.map((r) => r.id));
  const all = await db.select().from(job);
  const unscored = all.filter((j) => !scoredSet.has(j.id));
  if (!unscored.length) return { considered: 0, filtered: 0, scored: 0 };
  return matchJobs(unscored, profile);
}
