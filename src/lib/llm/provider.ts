import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { env } from "@/lib/env";
import type { Provider } from "./config";

/**
 * Turns a (provider, model) pair into an AI SDK `LanguageModel`. This is the ONLY
 * place that touches vendor SDKs; the rest of the app depends on the generic
 * `LanguageModel` interface, keeping everything model-agnostic.
 */
export function getModel(provider: Provider, model: string): LanguageModel {
  switch (provider) {
    case "anthropic": {
      if (!env.ANTHROPIC_API_KEY) throw missingKey("ANTHROPIC_API_KEY");
      return createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })(model);
    }
    case "openai": {
      if (!env.OPENAI_API_KEY) throw missingKey("OPENAI_API_KEY");
      return createOpenAI({ apiKey: env.OPENAI_API_KEY })(model);
    }
    case "google": {
      if (!env.GOOGLE_GENERATIVE_AI_API_KEY)
        throw missingKey("GOOGLE_GENERATIVE_AI_API_KEY");
      return createGoogleGenerativeAI({
        apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
      })(model);
    }
    case "local": {
      if (!env.LOCAL_LLM_BASE_URL)
        throw new Error(
          "Local model selected but LOCAL_LLM_BASE_URL is not set (e.g. http://localhost:11434/v1 for Ollama).",
        );
      return createOpenAICompatible({
        name: "local",
        baseURL: env.LOCAL_LLM_BASE_URL,
        apiKey: env.LOCAL_LLM_API_KEY ?? "not-needed",
      })(model);
    }
  }
}

function missingKey(name: string): Error {
  return new Error(
    `${name} is not set. Add it to .env.local or pick a different provider in settings.`,
  );
}
