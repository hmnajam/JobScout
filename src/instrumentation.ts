/**
 * Runs once when a Next.js server instance boots. We use it to start the cron
 * scheduler in the Node runtime only — it depends on node-cron and better-sqlite3,
 * neither of which runs on the Edge runtime.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { applySchedule } = await import("@/lib/schedule/scheduler");
  applySchedule();
}
