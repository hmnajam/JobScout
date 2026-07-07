import { env } from "@/lib/env";
import { loadLlmConfig } from "@/lib/llm/config";
import { getProfile } from "@/lib/profile/store";
import { loadScheduleConfig } from "@/lib/schedule/config";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const llm = loadLlmConfig();
  const profile = await getProfile();
  const schedule = loadScheduleConfig();

  // Which providers have credentials configured (informational only).
  const availability = {
    anthropic: Boolean(env.ANTHROPIC_API_KEY),
    openai: Boolean(env.OPENAI_API_KEY),
    google: Boolean(env.GOOGLE_GENERATIVE_AI_API_KEY),
    local: Boolean(env.LOCAL_LLM_BASE_URL),
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted">
          Configure your job criteria and the AI provider behind every feature.
        </p>
      </header>

      <SettingsForm
        llm={llm}
        availability={availability}
        schedule={schedule}
        profile={
          profile
            ? {
                roleTargets: profile.roleTargets,
                seniority: profile.seniority,
                locations: profile.locations,
                remotePref: profile.remotePref,
                salaryFloor: profile.salaryFloor,
                currency: profile.currency,
                dealbreakers: profile.dealbreakers,
              }
            : null
        }
      />
    </div>
  );
}
