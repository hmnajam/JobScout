import { z } from "zod";

/**
 * Validated environment configuration.
 *
 * Everything here is optional except the DB path so the app boots with zero
 * config. Individual features (a cloud provider, a job source) check for their
 * own keys at call time and degrade gracefully when absent.
 */
const envSchema = z.object({
  // Postgres connection string (Neon / Vercel Postgres / local postgres).
  DATABASE_URL: z.string().default("postgresql://localhost:5432/jobscout"),

  // LLM providers — all optional; the active model is chosen in settings/env.
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  // Base URL for a local OpenAI-compatible server (Ollama / LM Studio).
  LOCAL_LLM_BASE_URL: z.string().url().optional(),
  LOCAL_LLM_API_KEY: z.string().optional(),

  // LLM routing via env (used on hosted deploys where config can't be written
  // to disk). All optional; falls back to jobscout.config.json then defaults.
  LLM_PROVIDER: z.enum(["anthropic", "openai", "google", "local"]).optional(),
  LLM_MODEL_FAST: z.string().optional(),
  LLM_MODEL_QUALITY: z.string().optional(),
  LLM_TASK_SCORING: z.enum(["anthropic", "openai", "google", "local"]).optional(),
  LLM_TASK_EXTRACTION: z
    .enum(["anthropic", "openai", "google", "local"])
    .optional(),
  LLM_TASK_RESUME: z.enum(["anthropic", "openai", "google", "local"]).optional(),
  LLM_TASK_DRAFTING: z
    .enum(["anthropic", "openai", "google", "local"])
    .optional(),

  // Shared secret guarding the Vercel Cron endpoint (/api/cron).
  CRON_SECRET: z.string().optional(),

  // Job sources — optional keys.
  RAPIDAPI_KEY: z.string().optional(), // JSearch
  ADZUNA_APP_ID: z.string().optional(),
  ADZUNA_APP_KEY: z.string().optional(),

  // ATS company boards to poll, comma-separated `provider:token` entries, e.g.
  // "greenhouse:stripe,lever:netflix,ashby:openai".
  ATS_COMPANIES: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
