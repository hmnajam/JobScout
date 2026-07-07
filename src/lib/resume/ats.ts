import { z } from "zod";
import { extract } from "@/lib/llm";
import type { ResumeContent } from "@/lib/db/schema";

/**
 * ATS (applicant tracking system) review. Scores a resume for clarity, keyword
 * coverage, and structure, and lists concrete fixes. Optionally evaluated against
 * a specific target job description for keyword-gap analysis.
 */

export const atsReviewSchema = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  issues: z.array(
    z.object({
      severity: z.enum(["high", "medium", "low"]),
      issue: z.string(),
      fix: z.string(),
    }),
  ),
  missingKeywords: z.array(z.string()),
});

export type AtsReview = z.infer<typeof atsReviewSchema>;

export async function reviewResume(
  content: ResumeContent,
  jobDescription?: string,
): Promise<AtsReview> {
  const { value } = await extract("resume", {
    schema: atsReviewSchema,
    system:
      "You are an ATS and resume-quality auditor. Evaluate the resume for: " +
      "parseable structure, strong action verbs, quantified achievements, " +
      "keyword coverage, and conciseness. Score 0-100. List concrete, specific " +
      "fixes (not generic advice). If a target job description is provided, list " +
      "important keywords/skills it requires that are missing from the resume in " +
      "`missingKeywords`; otherwise leave it empty.",
    prompt:
      `RESUME (JSON):\n${JSON.stringify(content)}` +
      (jobDescription
        ? `\n\nTARGET JOB DESCRIPTION:\n${jobDescription}`
        : ""),
    temperature: 0.2,
  });
  return value;
}
