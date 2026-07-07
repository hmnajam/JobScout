import type { Job, Match, ResumeContent } from "@/lib/db/schema";
import { complete, extract } from "@/lib/llm";
import { resumeContentSchema } from "@/lib/resume/schema";

/**
 * Per-job drafting: a tailored resume variant and a cover letter. Both build on
 * the master resume + the posting + the match reasoning, and both run through the
 * model-agnostic LLM layer (the "resume" and "drafting" quality-tier tasks).
 *
 * Hard guardrail: reorder and reword to emphasize relevant experience, but never
 * invent employers, dates, or metrics. The output must stay truthful to the
 * master resume — a tailored resume that lies is worse than useless.
 */

const NO_FABRICATION =
  "Never fabricate facts, employers, roles, dates, or metrics. Only reorder, " +
  "reword, and re-emphasize what is already in the source resume. Where a concrete " +
  "number would strengthen a point but isn't present, leave a bracketed placeholder " +
  "like [X%] rather than inventing one.";

/** A compact text description of the posting for use as LLM context. */
function describeJob(job: Job, match: Match | null): string {
  const parts = [
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    job.location ? `Location: ${job.location}` : null,
    job.remote ? "Remote: yes" : null,
    job.description ? `\nDescription:\n${job.description}` : null,
  ].filter(Boolean);
  if (match && match.reasons.length > 0) {
    parts.push(`\nWhy this candidate fits:\n- ${match.reasons.join("\n- ")}`);
  }
  if (match && match.concerns.length > 0) {
    parts.push(`\nGaps to address:\n- ${match.concerns.join("\n- ")}`);
  }
  return parts.join("\n");
}

/**
 * Produce a resume variant tailored to a specific job: same facts, reordered and
 * reworded to foreground the experience, skills, and projects the posting cares
 * about. Returns validated structured content the user can review and export.
 */
export async function tailorResume(
  master: ResumeContent,
  job: Job,
  match: Match | null,
): Promise<ResumeContent> {
  const { value } = await extract("resume", {
    schema: resumeContentSchema,
    system:
      "You are an expert resume writer tailoring a candidate's master resume to a " +
      "specific job posting. Keep every real experience entry, but reorder bullets " +
      "and experiences to lead with what's most relevant to this role, rewrite the " +
      "summary to target the role, and surface the skills the posting emphasizes. " +
      `Preserve all contact info, companies, titles, and dates exactly. ${NO_FABRICATION}`,
    prompt:
      `JOB POSTING\n${describeJob(job, match)}\n\n` +
      `MASTER RESUME (JSON)\n${JSON.stringify(master, null, 2)}\n\n` +
      "Return the tailored resume in the same structure.",
    temperature: 0.4,
  });
  return value;
}

/**
 * Draft a concise cover letter grounded in the candidate's resume and the posting.
 * Returns plain text (no markdown) the user can edit before use.
 */
export async function draftCoverLetter(
  resume: ResumeContent,
  job: Job,
  match: Match | null,
): Promise<string> {
  const { value } = await complete("drafting", {
    system:
      "You are helping a candidate draft a cover letter. Write 3-4 short paragraphs: " +
      "a specific opening that names the role and company, a middle that connects the " +
      "candidate's real experience to what the role needs, and a brief close. Be warm " +
      "but concise, no clichés or filler. Return only the letter body as plain text " +
      `(no markdown, no placeholders for name/date/address). ${NO_FABRICATION}`,
    prompt:
      `JOB POSTING\n${describeJob(job, match)}\n\n` +
      `CANDIDATE RESUME (JSON)\n${JSON.stringify(resume, null, 2)}`,
    temperature: 0.6,
  });
  return value.trim();
}
