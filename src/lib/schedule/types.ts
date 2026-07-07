import { z } from "zod";

/**
 * Client-safe scheduling types and constants — no `node:fs`/`node-cron` imports,
 * so this is importable from client components (the Settings form). File I/O and
 * cron validation live in `config.ts`, which must stay server-only.
 */

export const scheduleConfigSchema = z.object({
  enabled: z.boolean().default(false),
  // A standard 5-field cron expression. Default: daily at 08:00.
  cron: z.string().default("0 8 * * *"),
});

export type ScheduleConfig = z.infer<typeof scheduleConfigSchema>;

/** Named presets offered in the UI (value is the cron expression). */
export const SCHEDULE_PRESETS = [
  { label: "Every hour", cron: "0 * * * *" },
  { label: "Every 6 hours", cron: "0 */6 * * *" },
  { label: "Daily at 8am", cron: "0 8 * * *" },
  { label: "Weekly (Mon 8am)", cron: "0 8 * * 1" },
] as const;

/** Human-readable label for a cron expression, falling back to the raw string. */
export function describeCron(expr: string): string {
  return SCHEDULE_PRESETS.find((p) => p.cron === expr)?.label ?? expr;
}
