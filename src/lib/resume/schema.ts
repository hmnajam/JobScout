import { z } from "zod";
import type { ResumeContent } from "@/lib/db/schema";

/**
 * Zod schema for a structured resume. Used both to validate LLM extraction output
 * and to type the editor. Kept in sync with the `ResumeContent` type in the DB
 * schema (asserted below).
 */

export const resumeLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
});

export const resumeContactSchema = z.object({
  name: z.string().default(""),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.array(resumeLinkSchema).default([]),
});

export const resumeExperienceSchema = z.object({
  company: z.string().default(""),
  title: z.string().default(""),
  location: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  bullets: z.array(z.string()).default([]),
});

export const resumeEducationSchema = z.object({
  school: z.string().default(""),
  degree: z.string().optional(),
  field: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  details: z.string().optional(),
});

export const resumeProjectSchema = z.object({
  name: z.string().default(""),
  description: z.string().optional(),
  url: z.string().optional(),
  bullets: z.array(z.string()).default([]),
});

export const resumeContentSchema = z.object({
  contact: resumeContactSchema,
  summary: z.string().optional(),
  experience: z.array(resumeExperienceSchema).default([]),
  skills: z.array(z.string()).default([]),
  education: z.array(resumeEducationSchema).default([]),
  projects: z.array(resumeProjectSchema).default([]),
});

// Compile-time check that parsed output is assignable to the DB content type.
type _AssertMatches = z.infer<typeof resumeContentSchema> extends ResumeContent
  ? true
  : never;
const _assert: _AssertMatches = true;
void _assert;

/** An empty resume for a fresh "start from scratch" flow. */
export function emptyResume(): ResumeContent {
  return {
    contact: { name: "", links: [] },
    summary: "",
    experience: [],
    skills: [],
    education: [],
    projects: [],
  };
}
