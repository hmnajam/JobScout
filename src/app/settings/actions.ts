"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type LlmConfig, PROVIDERS, saveLlmConfig } from "@/lib/llm/config";
import { type ProfileInput, saveProfile } from "@/lib/profile/store";
import {
  type ScheduleConfig,
  saveScheduleConfig,
  scheduleConfigSchema,
} from "@/lib/schedule/config";
import { applySchedule } from "@/lib/schedule/scheduler";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const llmSchema = z.object({
  provider: z.enum(PROVIDERS),
  models: z.object({
    fast: z.string().optional(),
    quality: z.string().optional(),
  }),
});

export async function saveLlmConfigAction(
  raw: LlmConfig,
): Promise<ActionResult> {
  const parsed = llmSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid model config." };
  try {
    saveLlmConfig(parsed.data);
    revalidatePath("/settings");
    return { ok: true, message: "Model settings saved." };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Save failed.",
    };
  }
}

export async function saveScheduleAction(
  raw: ScheduleConfig,
): Promise<ActionResult> {
  const parsed = scheduleConfigSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid schedule config." };
  try {
    saveScheduleConfig(parsed.data);
    // Reconcile the live cron task with the new settings immediately.
    const applied = applySchedule();
    revalidatePath("/settings");
    return {
      ok: true,
      message: applied.enabled
        ? "Schedule saved and active."
        : "Schedule saved (disabled).",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Save failed.",
    };
  }
}

const profileSchema = z.object({
  roleTargets: z.array(z.string()),
  seniority: z.string().nullable().optional(),
  locations: z.array(z.string()),
  remotePref: z.enum(["remote", "hybrid", "onsite", "any"]),
  salaryFloor: z.number().nullable().optional(),
  currency: z.string(),
  dealbreakers: z.array(z.string()),
});

export async function saveProfileAction(
  raw: ProfileInput,
): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid profile." };
  try {
    await saveProfile(parsed.data);
    revalidatePath("/settings");
    return { ok: true, message: "Job criteria saved." };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Save failed.",
    };
  }
}
