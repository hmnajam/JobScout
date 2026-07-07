import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { type Resume, type ResumeContent, resume } from "@/lib/db/schema";

/** Return the master resume, or null if none has been created yet. */
export async function getMasterResume(): Promise<Resume | null> {
  const rows = await db
    .select()
    .from(resume)
    .where(eq(resume.isMaster, true))
    .limit(1);
  return rows[0] ?? null;
}

export async function getResume(id: number): Promise<Resume | null> {
  const rows = await db.select().from(resume).where(eq(resume.id, id)).limit(1);
  return rows[0] ?? null;
}

/** List all resumes, master first, then most-recently updated. */
export async function listResumes(): Promise<Resume[]> {
  return db
    .select()
    .from(resume)
    .orderBy(desc(resume.isMaster), desc(resume.updatedAt));
}

/**
 * Create the master resume, or replace its content if it already exists. The app
 * keeps a single master; tailored variants are separate rows created elsewhere.
 */
export async function upsertMasterResume(
  content: ResumeContent,
  name = "Master resume",
): Promise<Resume> {
  const existing = await getMasterResume();
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
    .values({ content, name, isMaster: true })
    .returning();
  return created;
}

/** Update an existing resume's content (master or variant). */
export async function updateResumeContent(
  id: number,
  content: ResumeContent,
): Promise<Resume> {
  const [updated] = await db
    .update(resume)
    .set({ content, updatedAt: new Date() })
    .where(eq(resume.id, id))
    .returning();
  return updated;
}
