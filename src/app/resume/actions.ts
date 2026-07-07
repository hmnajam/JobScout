"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { type ResumeContent, profile } from "@/lib/db/schema";
import { extractResume } from "@/lib/resume/extract";
import { parseResumeFile } from "@/lib/resume/parse";
import { resumeContentSchema } from "@/lib/resume/schema";
import {
  getMasterResume,
  updateResumeContent,
  upsertMasterResume,
} from "@/lib/resume/store";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Import a resume file: parse to text, LLM-extract to structured data, and save
 * as the master resume. Also seeds the profile's skills from the extracted list.
 */
export async function importResumeAction(
  formData: FormData,
): Promise<ActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file uploaded." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await parseResumeFile(buffer, file.name);
    if (text.length < 20) {
      return {
        ok: false,
        error:
          "Could not read meaningful text from that file. If it's a scanned PDF, try a text-based export.",
      };
    }

    const { content, provider, model } = await extractResume(text);
    await upsertMasterResume(content, file.name.replace(/\.[^.]+$/, ""));
    await syncProfileSkills(content.skills);

    revalidatePath("/resume");
    return {
      ok: true,
      message: `Imported with ${provider}/${model}. Review and edit below.`,
    };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Persist edits made in the structured editor. */
export async function saveResumeAction(
  id: number,
  raw: unknown,
): Promise<ActionResult> {
  const parsed = resumeContentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Resume data failed validation." };
  }

  try {
    const master = await getMasterResume();
    if (master && master.id === id) {
      await upsertMasterResume(parsed.data, master.name);
      await syncProfileSkills(parsed.data.skills);
    } else {
      await updateResumeContent(id, parsed.data);
    }
    revalidatePath("/resume");
    return { ok: true, message: "Saved." };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Create an empty master resume so the user can build one from scratch. */
export async function createBlankResumeAction(
  content: ResumeContent,
): Promise<ActionResult> {
  try {
    await upsertMasterResume(content);
    revalidatePath("/resume");
    return { ok: true, message: "Created." };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Keep the single profile row's skills in step with the master resume. */
async function syncProfileSkills(skills: string[]): Promise<void> {
  const rows = await db.select().from(profile).limit(1);
  if (rows[0]) {
    await db
      .update(profile)
      .set({ skills, updatedAt: new Date() })
      .where(eq(profile.id, rows[0].id));
  } else {
    await db.insert(profile).values({ skills });
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unexpected error.";
}
