import { extract } from "@/lib/llm";
import type { ResumeContent } from "@/lib/db/schema";
import { resumeContentSchema } from "./schema";

/**
 * Turn raw resume text into structured `ResumeContent` using the model-agnostic
 * LLM layer. Uses the "extraction" task (quality tier) with a zod schema so the
 * result is validated regardless of which provider/model is active.
 */
export async function extractResume(text: string): Promise<{
  content: ResumeContent;
  model: string;
  provider: string;
}> {
  const { value, model, provider } = await extract("extraction", {
    schema: resumeContentSchema,
    system:
      "You are a resume parser. Extract the resume into the given structured " +
      "schema. Preserve the candidate's exact wording for bullet points and the " +
      "summary — do not rewrite, embellish, or invent information. Split each " +
      "role's responsibilities into individual bullet strings. If a field is " +
      "absent, omit it or use an empty array.",
    prompt: `Resume text:\n\n${text}`,
    temperature: 0,
  });

  return { content: value, model, provider };
}
