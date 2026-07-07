import { generateObject, generateText } from "ai";
import type { z } from "zod";
import { type LlmTask, resolveTask } from "./config";
import { getModel } from "./provider";

/**
 * The app's entire LLM surface. Feature code calls `complete` / `extract` with a
 * logical task name; provider and model are resolved from config. No feature ever
 * imports a vendor SDK directly — see [[llm-model-agnostic]].
 */

export type LlmResult<T> = {
  value: T;
  model: string;
  provider: string;
};

/** Free-form text generation (e.g. cover-letter drafts). */
export async function complete(
  task: LlmTask,
  opts: { system?: string; prompt: string; temperature?: number },
): Promise<LlmResult<string>> {
  const { provider, model } = resolveTask(task);
  const { text } = await generateText({
    model: getModel(provider, model),
    system: opts.system,
    prompt: opts.prompt,
    temperature: opts.temperature,
  });
  return { value: text, model, provider };
}

/**
 * Structured generation validated against a zod schema. Used for extraction,
 * scoring, and resume ops so output is reliable regardless of provider — this
 * matters for local models that are weaker at raw JSON.
 */
export async function extract<T>(
  task: LlmTask,
  opts: {
    schema: z.ZodType<T>;
    system?: string;
    prompt: string;
    temperature?: number;
  },
): Promise<LlmResult<T>> {
  const { provider, model } = resolveTask(task);
  const { object } = await generateObject({
    model: getModel(provider, model),
    schema: opts.schema,
    system: opts.system,
    prompt: opts.prompt,
    temperature: opts.temperature,
  });
  return { value: object, model, provider };
}

export { resolveTask } from "./config";
export type { LlmTask } from "./config";
