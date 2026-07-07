"use server";

import type { ResumeContent, ResumeExperience } from "@/lib/db/schema";
import { improveBullets, improveSummary, suggestSkills } from "@/lib/resume/assist";
import { type AtsReview, reviewResume } from "@/lib/resume/ats";
import {
  resumeContentSchema,
  resumeExperienceSchema,
} from "@/lib/resume/schema";

export type AiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error: err instanceof Error ? err.message : "AI request failed.",
  };
}

export async function improveBulletsAction(
  raw: unknown,
): Promise<AiResult<string[]>> {
  const parsed = resumeExperienceSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid experience data." };
  try {
    return { ok: true, data: await improveBullets(parsed.data as ResumeExperience) };
  } catch (err) {
    return fail(err);
  }
}

export async function improveSummaryAction(
  raw: unknown,
): Promise<AiResult<string>> {
  const parsed = resumeContentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid resume data." };
  try {
    return { ok: true, data: await improveSummary(parsed.data as ResumeContent) };
  } catch (err) {
    return fail(err);
  }
}

export async function suggestSkillsAction(
  raw: unknown,
): Promise<AiResult<string[]>> {
  const parsed = resumeContentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid resume data." };
  try {
    return { ok: true, data: await suggestSkills(parsed.data as ResumeContent) };
  } catch (err) {
    return fail(err);
  }
}

export async function atsReviewAction(
  raw: unknown,
  jobDescription?: string,
): Promise<AiResult<AtsReview>> {
  const parsed = resumeContentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid resume data." };
  try {
    return {
      ok: true,
      data: await reviewResume(parsed.data as ResumeContent, jobDescription),
    };
  } catch (err) {
    return fail(err);
  }
}
