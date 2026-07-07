"use server";

import { revalidatePath } from "next/cache";
import { draftCoverLetter, tailorResume } from "@/lib/drafting";
import {
  getVariantForJob,
  saveCoverLetter,
  saveVariant,
} from "@/lib/drafting/store";
import { getJobDetail } from "@/lib/jobs/store";
import { getMasterResume } from "@/lib/resume/store";

/**
 * Drafting actions for a single job. Tailoring needs a master resume; the cover
 * letter prefers the tailored variant but falls back to the master. Nothing is
 * ever submitted — these produce drafts the user reviews and exports.
 */

export type TailorResult =
  | { ok: true; variantId: number }
  | { ok: false; error: string };

export async function tailorResumeAction(jobId: number): Promise<TailorResult> {
  try {
    const master = await getMasterResume();
    if (!master) {
      return {
        ok: false,
        error: "Create a master resume in the Resume Studio first.",
      };
    }
    const detail = await getJobDetail(jobId);
    if (!detail) return { ok: false, error: "Job not found." };

    const content = await tailorResume(master.content, detail.job, detail.match);
    const name = `${detail.job.company} — ${detail.job.title}`.slice(0, 120);
    const variant = await saveVariant(jobId, content, name);

    revalidatePath(`/jobs/${jobId}`);
    return { ok: true, variantId: variant.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Tailoring failed.",
    };
  }
}

export type DraftResult =
  | { ok: true; coverLetter: string }
  | { ok: false; error: string };

export async function draftCoverLetterAction(
  jobId: number,
): Promise<DraftResult> {
  try {
    const detail = await getJobDetail(jobId);
    if (!detail) return { ok: false, error: "Job not found." };

    // Prefer the tailored variant so the letter and resume tell one story.
    const variant = await getVariantForJob(jobId);
    const master = await getMasterResume();
    const source = variant ?? master;
    if (!source) {
      return {
        ok: false,
        error: "Create a master resume in the Resume Studio first.",
      };
    }

    const letter = await draftCoverLetter(
      source.content,
      detail.job,
      detail.match,
    );
    await saveCoverLetter(jobId, letter);

    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/jobs");
    return { ok: true, coverLetter: letter };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Drafting failed.",
    };
  }
}

export async function saveCoverLetterAction(
  jobId: number,
  coverLetter: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await saveCoverLetter(jobId, coverLetter);
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/jobs");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Save failed.",
    };
  }
}
