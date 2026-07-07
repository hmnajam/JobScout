import cron, { type ScheduledTask } from "node-cron";
import { runPipeline } from "@/lib/pipeline";
import { loadScheduleConfig } from "./config";

/**
 * Cron-driven pipeline runner. `applySchedule()` reconciles the live cron task
 * with the persisted config — call it at server boot (via instrumentation) and
 * whenever the schedule settings change.
 *
 * The task lives on `globalThis` so it survives dev HMR reloads instead of
 * accumulating a new cron job on every hot update.
 */

type SchedulerState = { task: ScheduledTask | null; cron: string | null };

const g = globalThis as typeof globalThis & {
  __jobscoutScheduler?: SchedulerState;
};
const state: SchedulerState = (g.__jobscoutScheduler ??= {
  task: null,
  cron: null,
});

/** Start/stop/re-point the cron task to match the saved config. */
export function applySchedule(): { enabled: boolean; cron: string | null } {
  const config = loadScheduleConfig();

  // Tear down any existing task first — simplest way to reconcile changes.
  if (state.task) {
    state.task.destroy();
    state.task = null;
    state.cron = null;
  }

  if (!config.enabled) {
    return { enabled: false, cron: null };
  }

  if (!cron.validate(config.cron)) {
    console.error(`[scheduler] invalid cron expression: ${config.cron}`);
    return { enabled: false, cron: null };
  }

  // noOverlap skips a tick if the previous run is still going.
  state.task = cron.schedule(
    config.cron,
    async () => {
      try {
        const result = await runPipeline("cron");
        console.log(
          `[scheduler] run ${result.runId}: +${result.added} jobs, ${result.scored} scored`,
        );
      } catch (err) {
        console.error("[scheduler] run failed:", err);
      }
    },
    { noOverlap: true },
  );
  state.cron = config.cron;

  console.log(`[scheduler] scheduled pipeline: ${config.cron}`);
  return { enabled: true, cron: config.cron };
}

/** The next scheduled run time, or null when disabled. */
export function nextRun(): Date | null {
  return state.task?.getNextRun() ?? null;
}
