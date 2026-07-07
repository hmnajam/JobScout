import { z } from "zod";
import type { Job, Profile, ResumeContent } from "@/lib/db/schema";
import { extract } from "@/lib/llm";

/**
 * LLM fit scoring for the `scoring` task (defaults to a fast/cheap model).
 *
 * Jobs are scored in batches to keep the number of calls — and thus cost and
 * rate-limit pressure — low. Each batch returns one entry per job, matched back
 * by array index.
 */

export type JobScore = {
  score: number; // 0-100
  reasons: string[];
  concerns: string[];
};

export type ScoredJob = {
  job: Job;
  score: JobScore;
  model: string;
};

const DEFAULT_BATCH_SIZE = 5;

const batchSchema = z.object({
  scores: z
    .array(
      z.object({
        index: z.number().int(),
        score: z.number().min(0).max(100),
        reasons: z.array(z.string()),
        concerns: z.array(z.string()),
      }),
    )
    .describe("One entry per job, in the same order as the input list."),
});

const SYSTEM = `You are a meticulous technical recruiter scoring how well job postings fit ONE candidate.
Score 0-100 where 100 is a near-perfect fit for the candidate's skills, seniority, and stated preferences.
Base the score only on evidence in the posting and the candidate profile — do not invent qualifications.
"reasons" = concrete reasons it fits (skills/domain/seniority overlap). "concerns" = genuine mismatches or risks.
Be calibrated: an average posting for this candidate should land near 50, not 80.`;

function profileContext(profile: Profile, resume: ResumeContent | null): string {
  const lines: string[] = [];
  lines.push(`Target roles: ${profile.roleTargets.join(", ") || "(unspecified)"}`);
  if (profile.seniority) lines.push(`Seniority: ${profile.seniority}`);
  lines.push(`Remote preference: ${profile.remotePref}`);
  if (profile.locations.length)
    lines.push(`Preferred locations: ${profile.locations.join(", ")}`);
  if (profile.salaryFloor != null)
    lines.push(`Salary floor: ${profile.salaryFloor} ${profile.currency}`);
  if (profile.dealbreakers.length)
    lines.push(`Dealbreakers: ${profile.dealbreakers.join(", ")}`);

  const skills = resume?.skills?.length ? resume.skills : profile.skills;
  if (skills.length) lines.push(`Skills: ${skills.join(", ")}`);

  if (resume?.summary) lines.push(`Summary: ${resume.summary}`);
  if (resume?.experience?.length) {
    const exp = resume.experience
      .slice(0, 4)
      .map((e) => `${e.title} @ ${e.company}`)
      .join("; ");
    lines.push(`Recent experience: ${exp}`);
  }
  return lines.join("\n");
}

function jobBlock(job: Job, index: number): string {
  const desc = (job.description ?? "").slice(0, 1500);
  const pay =
    job.salaryMin || job.salaryMax
      ? `Salary: ${job.salaryMin ?? "?"}-${job.salaryMax ?? "?"} ${job.currency ?? ""}`
      : "";
  return [
    `--- Job [${index}] ---`,
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    `Location: ${job.location ?? "unspecified"}${job.remote ? " (remote)" : ""}`,
    pay,
    `Description: ${desc}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Score a batch of jobs against the profile. */
export async function scoreJobs(
  jobs: Job[],
  profile: Profile,
  resume: ResumeContent | null,
  batchSize = DEFAULT_BATCH_SIZE,
): Promise<ScoredJob[]> {
  const out: ScoredJob[] = [];
  const ctx = profileContext(profile, resume);

  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    const prompt = [
      "CANDIDATE PROFILE:",
      ctx,
      "",
      `JOB POSTINGS (score all ${batch.length}):`,
      ...batch.map((j, k) => jobBlock(j, k)),
    ].join("\n");

    const { value, model } = await extract("scoring", {
      schema: batchSchema,
      system: SYSTEM,
      prompt,
      temperature: 0,
    });

    const byIndex = new Map(value.scores.map((s) => [s.index, s]));
    batch.forEach((job, k) => {
      const s = byIndex.get(k);
      out.push({
        job,
        model,
        score: {
          score: s ? Math.round(s.score) : 0,
          reasons: s?.reasons ?? [],
          concerns: s?.concerns ?? (s ? [] : ["not scored by model"]),
        },
      });
    });
  }

  return out;
}
