import { z } from "zod";

/**
 * Validated environment configuration.
 *
 * Everything here is optional except the DB path so the app boots with zero
 * config. Individual features (a cloud provider, a job source) check for their
 * own keys at call time and degrade gracefully when absent.
 */
const envSchema = z.object({
  DATABASE_PATH: z.string().default("./jobscout.db"),

  // LLM providers — all optional; the active model is chosen in settings.
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  // Base URL for a local OpenAI-compatible server (Ollama / LM Studio).
  LOCAL_LLM_BASE_URL: z.string().url().optional(),
  LOCAL_LLM_API_KEY: z.string().optional(),

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
