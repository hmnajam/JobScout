import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import cron from "node-cron";
import { type ScheduleConfig, scheduleConfigSchema } from "./types";

/**
 * Server-only scheduling config I/O, persisted alongside the LLM config in
 * jobscout.config.json (under a `schedule` key). Client-safe pieces (the schema,
 * presets, labels) live in `types.ts` — import those from client components.
 */

export { scheduleConfigSchema, SCHEDULE_PRESETS, describeCron } from "./types";
export type { ScheduleConfig } from "./types";

const CONFIG_PATH = path.join(process.cwd(), "jobscout.config.json");

export function loadScheduleConfig(): ScheduleConfig {
  if (existsSync(CONFIG_PATH)) {
    try {
      const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
      return scheduleConfigSchema.parse(raw.schedule ?? {});
    } catch {
      // Fall through to defaults on a malformed file.
    }
  }
  return scheduleConfigSchema.parse({});
}

export function saveScheduleConfig(config: ScheduleConfig): void {
  const parsed = scheduleConfigSchema.parse(config);
  if (!cron.validate(parsed.cron)) {
    throw new Error(`Invalid cron expression: "${parsed.cron}"`);
  }
  const existing = existsSync(CONFIG_PATH)
    ? JSON.parse(readFileSync(CONFIG_PATH, "utf8"))
    : {};
  writeFileSync(
    CONFIG_PATH,
    JSON.stringify({ ...existing, schedule: parsed }, null, 2),
  );
}
