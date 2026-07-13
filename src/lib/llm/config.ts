import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { env } from "@/lib/env";

/**
 * Model-agnostic configuration.
 *
 * The app never hard-codes a provider. Each logical *task* (see `LlmTask`) maps
 * to a tier — "fast" for high-volume work like job scoring, "quality" for work
 * where output matters like resume editing and drafting. A single active provider
 * supplies a model id per tier. Switching providers (including to a local
 * Ollama/LM Studio server) is a config change, never a code change.
 */

export const PROVIDERS = ["anthropic", "openai", "google", "local"] as const;
export type Provider = (typeof PROVIDERS)[number];

export type Tier = "fast" | "quality";

export type LlmTask =
  | "scoring" // rank jobs — high volume
  | "extraction" // parse resume text into structured data
  | "resume" // resume editing / ATS feedback / tailoring
  | "drafting"; // cover letters

const TASK_TIER: Record<LlmTask, Tier> = {
  scoring: "fast",
  extraction: "quality",
  resume: "quality",
  drafting: "quality",
};

/** Sensible per-provider defaults for each tier. All are overridable in config. */
const PROVIDER_DEFAULTS: Record<Provider, Record<Tier, string>> = {
  anthropic: {
    fast: "claude-haiku-4-5-20251001",
    quality: "claude-sonnet-5",
  },
  openai: {
    fast: "gpt-4o-mini",
    quality: "gpt-4o",
  },
  google: {
    fast: "gemini-2.5-flash-lite",
    quality: "gemini-2.5-flash",
  },
  local: {
    // Overridable via config; whatever model you've pulled locally.
    fast: "llama3.1",
    quality: "llama3.1",
  },
};

const llmConfigSchema = z.object({
  provider: z.enum(PROVIDERS),
  // Optional explicit model id per tier; falls back to PROVIDER_DEFAULTS.
  models: z
    .object({ fast: z.string().optional(), quality: z.string().optional() })
    .partial()
    .default({}),
  // Optional per-task provider override. Lets cheap/free providers handle most
  // work while routing only the tasks that need a stronger model elsewhere —
  // e.g. Gemini free for scoring/drafting, OpenAI for resume structured output.
  taskProviders: z
    .object({
      scoring: z.enum(PROVIDERS).optional(),
      extraction: z.enum(PROVIDERS).optional(),
      resume: z.enum(PROVIDERS).optional(),
      drafting: z.enum(PROVIDERS).optional(),
    })
    .default({}),
});

export type LlmConfig = z.infer<typeof llmConfigSchema>;
/** Input shape (before zod defaults are applied) — what callers may supply. */
export type LlmConfigInput = z.input<typeof llmConfigSchema>;

const CONFIG_PATH = path.join(process.cwd(), "jobscout.config.json");

/** Choose a default provider based on which credentials are present. */
function detectDefaultProvider(): Provider {
  if (env.LOCAL_LLM_BASE_URL) return "local";
  if (env.ANTHROPIC_API_KEY) return "anthropic";
  if (env.OPENAI_API_KEY) return "openai";
  if (env.GOOGLE_GENERATIVE_AI_API_KEY) return "google";
  return "anthropic"; // last resort; a helpful error surfaces at call time
}

/**
 * Build LLM config from env vars, if `LLM_PROVIDER` is set. Used on hosted
 * deploys (e.g. Vercel) where the runtime filesystem is read-only, so config
 * lives in env instead of jobscout.config.json.
 */
function envLlmConfig(): LlmConfig | null {
  if (!env.LLM_PROVIDER) return null;
  return llmConfigSchema.parse({
    provider: env.LLM_PROVIDER,
    models: {
      fast: env.LLM_MODEL_FAST,
      quality: env.LLM_MODEL_QUALITY,
    },
    taskProviders: {
      scoring: env.LLM_TASK_SCORING,
      extraction: env.LLM_TASK_EXTRACTION,
      resume: env.LLM_TASK_RESUME,
      drafting: env.LLM_TASK_DRAFTING,
    },
  });
}

/** Load LLM config: env vars first, then disk, then an env-derived default. */
export function loadLlmConfig(): LlmConfig {
  const fromEnv = envLlmConfig();
  if (fromEnv) return fromEnv;

  if (existsSync(CONFIG_PATH)) {
    try {
      const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
      return llmConfigSchema.parse(raw.llm ?? raw);
    } catch {
      // Fall through to env-derived default on a malformed file.
    }
  }
  return llmConfigSchema.parse({ provider: detectDefaultProvider(), models: {} });
}

/** Persist LLM config (used by the settings UI). */
export function saveLlmConfig(config: LlmConfigInput): void {
  const existing = existsSync(CONFIG_PATH)
    ? JSON.parse(readFileSync(CONFIG_PATH, "utf8"))
    : {};
  writeFileSync(
    CONFIG_PATH,
    JSON.stringify({ ...existing, llm: llmConfigSchema.parse(config) }, null, 2),
  );
}

/** Resolve the concrete provider + model id for a task. */
export function resolveTask(task: LlmTask): {
  provider: Provider;
  model: string;
  tier: Tier;
} {
  const config = loadLlmConfig();
  const tier = TASK_TIER[task];
  const provider = config.taskProviders[task] ?? config.provider;
  const model = config.models[tier] ?? PROVIDER_DEFAULTS[provider][tier];
  return { provider, model, tier };
}

export { PROVIDER_DEFAULTS };
