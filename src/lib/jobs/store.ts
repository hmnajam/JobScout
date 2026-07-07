import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { application, job, match } from "@/lib/db/schema";
import type {
  ApplicationStatus,
  JobFilters,
  JobWithMatch,
} from "./types";

export { STATUSES } from "./types";
export type {
  ApplicationStatus,
  JobFilters,
  JobWithMatch,
} from "./types";

/** List matched jobs, highest score first (unscored jobs sort last). */
export async function listJobs(
  filters: JobFilters = {},
): Promise<JobWithMatch[]> {
  const rows = await db
    .select({ job, match, application })
    .from(job)
    .leftJoin(match, eq(match.jobId, job.id))
    .leftJoin(application, eq(application.jobId, job.id))
    .orderBy(desc(match.score), desc(job.fetchedAt));

  let list: JobWithMatch[] = rows.map((r) => ({
    job: r.job,
    match: r.match,
    status: r.application?.status ?? "new",
    applicationId: r.application?.id ?? null,
  }));

  if (filters.minScore != null && filters.minScore > 0) {
    // minScore 0 keeps everything, including not-yet-scored jobs.
    list = list.filter((r) => (r.match?.score ?? -1) >= filters.minScore!);
  }
  if (filters.status) {
    list = list.filter((r) => r.status === filters.status);
  }
  if (filters.remoteOnly) {
    list = list.filter((r) => r.job.remote === true);
  }
  return list;
}

/** Full detail for one job: posting + match reasoning + status. */
export async function getJobDetail(id: number): Promise<JobWithMatch | null> {
  const rows = await db
    .select({ job, match, application })
    .from(job)
    .leftJoin(match, eq(match.jobId, job.id))
    .leftJoin(application, eq(application.jobId, job.id))
    .where(eq(job.id, id))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    job: r.job,
    match: r.match,
    status: r.application?.status ?? "new",
    applicationId: r.application?.id ?? null,
  };
}

/**
 * Set the tracked status for a job, creating the application row on first use.
 * Applications are drafts/tracking only — nothing is ever auto-submitted.
 */
export async function setJobStatus(
  jobId: number,
  status: ApplicationStatus,
): Promise<void> {
  const existing = await db
    .select({ id: application.id })
    .from(application)
    .where(eq(application.jobId, jobId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(application)
      .set({ status, updatedAt: new Date() })
      .where(eq(application.id, existing[0].id));
  } else {
    await db.insert(application).values({ jobId, status });
  }
}

/** Counts per status for dashboard summary chips. */
export async function statusCounts(): Promise<Record<string, number>> {
  const rows = await db.select().from(application);
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return counts;
}
