import { z } from "zod";
import { complete, extract } from "@/lib/llm";
import type { ResumeContent, ResumeExperience } from "@/lib/db/schema";

/**
 * AI-assisted resume editing. Each function returns a *suggestion* the user
 * reviews and accepts in the editor — nothing is applied automatically. All go
 * through the model-agnostic LLM layer (the "resume" quality-tier task).
 *
 * Guardrail shared across ops: improve wording and structure, but never invent
 * facts (employers, dates, metrics). Where a number would strengthen a claim,
 * insert a clearly-marked `[X]` placeholder for the user to fill in.
 */

const NO_FABRICATION =
  "Never fabricate facts, employers, dates, or metrics. Where a concrete number " +
  "would strengthen a statement but you don't have one, insert a bracketed " +
  "placeholder like [X%] or [N] for the user to fill in.";

/** Rewrite an experience's bullets to be impact-oriented and concise. */
export async function improveBullets(
  exp: ResumeExperience,
): Promise<string[]> {
  const { value } = await extract("resume", {
    schema: z.object({ bullets: z.array(z.string()) }),
    system: `You are an expert resume writer. Rewrite the bullet points for a single role to be concise, achievement-focused, and to start with strong action verbs. Keep roughly the same number of bullets. ${NO_FABRICATION}`,
    prompt:
      `Role: ${exp.title} at ${exp.company}\n\n` +
      `Current bullets:\n${exp.bullets.map((b) => `- ${b}`).join("\n")}`,
    temperature: 0.4,
  });
  return value.bullets;
}

/** Tighten the professional summary. */
export async function improveSummary(content: ResumeContent): Promise<string> {
  const { value } = await complete("resume", {
    system: `You are an expert resume writer. Write a crisp 2-3 sentence professional summary. Return only the summary text, no preamble. ${NO_FABRICATION}`,
    prompt: summarizeForContext(content),
    temperature: 0.4,
  });
  return value.trim();
}

/** Suggest skills the resume implies but doesn't list explicitly. */
export async function suggestSkills(content: ResumeContent): Promise<string[]> {
  const { value } = await extract("resume", {
    schema: z.object({ skills: z.array(z.string()) }),
    system:
      "Suggest skills that are clearly evidenced by this candidate's experience " +
      "but missing from their skills list. Only include skills genuinely implied " +
      "by the roles and projects described — do not pad. Return at most 10.",
    prompt:
      `Existing skills: ${content.skills.join(", ") || "(none)"}\n\n` +
      summarizeForContext(content),
    temperature: 0.3,
  });
  // Drop anything already present (case-insensitive).
  const have = new Set(content.skills.map((s) => s.toLowerCase()));
  return value.skills.filter((s) => !have.has(s.toLowerCase()));
}

/** Compact text view of a resume for use as LLM context. */
function summarizeForContext(content: ResumeContent): string {
  const exp = content.experience
    .map(
      (e) =>
        `${e.title} at ${e.company} (${e.start ?? ""}–${e.end ?? "Present"})\n` +
        e.bullets.map((b) => `  - ${b}`).join("\n"),
    )
    .join("\n\n");
  const proj = content.projects
    .map((p) => `${p.name}: ${p.description ?? ""}`)
    .join("\n");
  return `Experience:\n${exp}\n\nProjects:\n${proj}`;
}
