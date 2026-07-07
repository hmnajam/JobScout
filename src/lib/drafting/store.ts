import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  application,
  type Resume,
  type ResumeContent,
  resume,
} from "@/lib/db/schema";

/**
 * Persistence for per-job drafts: a tailored resume variant (a `resume` row with
 * `jobId` set and `isMaster` false) and a cover letter (stored on the job's
 * `application` row). One variant per job — re-tailoring replaces it in place.
 */

/** The tailored resume variant for a job, if one has been generated. */
export async function getVariantForJob(jobId: number): Promise<Resume | null> {
  const rows = await db
    .select()
    .from(resume)
    .where(and(eq(resume.jobId, jobId), eq(resume.isMaster, false)))
    .limit(1);
  return rows[0] ?? null;
}

/** Create or replace the tailored variant for a job. */
export async function saveVariant(
  jobId: number,
  content: ResumeContent,
  name: string,
): Promise<Resume> {
  const existing = await getVariantForJob(jobId);
  if (existing) {
    const [updated] = await db
      .update(resume)
      .set({ content, name, updatedAt: new Date() })
      .where(eq(resume.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(resume)
    .values({ jobId, content, name, isMaster: false })
    .returning();
  return created;
}

/** The saved cover letter for a job, if any. */
export async function getCoverLetter(jobId: number): Promise<string | null> {
  const rows = await db
    .select({ coverLetter: application.coverLetter })
    .from(application)
    .where(eq(application.jobId, jobId))
    .limit(1);
  return rows[0]?.coverLetter ?? null;
}

/**
 * Save a cover letter onto the job's application row, creating it if needed. Also
 * links the tailored variant (if present) and nudges status to "drafted" so the
 * dashboard reflects that work has begun — without clobbering a later status.
 */
export async function saveCoverLetter(
  jobId: number,
  coverLetter: string,
): Promise<void> {
  const variant = await getVariantForJob(jobId);
  const existing = await db
    .select({ id: application.id, status: application.status })
    .from(application)
    .where(eq(application.jobId, jobId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(application)
      .set({
        coverLetter,
        resumeId: variant?.id ?? null,
        status: existing[0].status === "new" ? "drafted" : existing[0].status,
        updatedAt: new Date(),
      })
      .where(eq(application.id, existing[0].id));
  } else {
    await db.insert(application).values({
      jobId,
      coverLetter,
      resumeId: variant?.id ?? null,
      status: "drafted",
    });
  }
}
