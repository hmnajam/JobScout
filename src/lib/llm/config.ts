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
});

export type LlmConfig = z.infer<typeof llmConfigSchema>;

const CONFIG_PATH = path.join(process.cwd(), "jobscout.config.json");

/** Choose a default provider based on which credentials are present. */
function detectDefaultProvider(): Provider {
  if (env.LOCAL_LLM_BASE_URL) return "local";
  if (env.ANTHROPIC_API_KEY) return "anthropic";
  if (env.OPENAI_API_KEY) return "openai";
  if (env.GOOGLE_GENERATIVE_AI_API_KEY) return "google";
  return "anthropic"; // last resort; a helpful error surfaces at call time
}

/** Load persisted LLM config from disk, or derive a default from the env. */
export function loadLlmConfig(): LlmConfig {
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
export function saveLlmConfig(config: LlmConfig): void {
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
  const model =
    config.models[tier] ?? PROVIDER_DEFAULTS[config.provider][tier];
  return { provider: config.provider, model, tier };
}

export { PROVIDER_DEFAULTS };
