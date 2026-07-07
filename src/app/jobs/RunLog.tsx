import type { Run } from "@/lib/db/schema";
import { describeCron, loadScheduleConfig } from "@/lib/schedule/config";
import { listRuns } from "@/lib/schedule/runs";
import { nextRun } from "@/lib/schedule/scheduler";

/**
 * Server-rendered log of recent pipeline runs plus current schedule status.
 * Revalidated whenever a run completes (manual action or cron), so it stays
 * current without client polling.
 */
export async function RunLog() {
  const [runs, schedule] = await Promise.all([
    listRuns(8),
    Promise.resolve(loadScheduleConfig()),
  ]);
  const upcoming = schedule.enabled ? nextRun() : null;

  return (
    <section className="card mt-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium tracking-tight">Run log</h2>
        <span className="text-sm text-muted">
          {schedule.enabled ? (
            <>
              Scheduled{" "}
              <span className="font-medium text-fg">
                {describeCron(schedule.cron)}
              </span>
              {upcoming && (
                <> · next {upcoming.toLocaleString()}</>
              )}
            </>
          ) : (
            <>
              Scheduling off ·{" "}
              <a href="/settings" className="underline">
                enable in Settings
              </a>
            </>
          )}
        </span>
      </div>

      {runs.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No runs yet. Click “Run search” above to fetch and score jobs.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {runs.map((r) => (
            <RunRow key={r.id} run={r} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RunRow({ run }: { run: Run }) {
  const when = run.startedAt.toLocaleString();
  const running = run.finishedAt == null;
  const hasErrors = run.errors.length > 0;

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="chip">{run.trigger}</span>
        <span className="text-muted">{when}</span>
      </div>
      <div className="flex items-center gap-4 tabular-nums">
        <span className="text-muted">
          <span className="font-medium text-fg">{run.fetched}</span> fetched
        </span>
        <span className="text-muted">
          <span className="font-medium text-good">+{run.added}</span> added
        </span>
        <span className="text-muted">
          <span className="font-medium text-accent">{run.scored}</span> scored
        </span>
        {running ? (
          <span className="chip" style={{ color: "var(--accent)" }}>
            running…
          </span>
        ) : hasErrors ? (
          <span
            className="chip"
            style={{ background: "var(--warn-soft)", color: "var(--warn)" }}
            title={run.errors.join("\n")}
          >
            {run.errors.length} issue{run.errors.length > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="chip" style={{ color: "var(--good)" }}>
            ok
          </span>
        )}
      </div>
    </li>
  );
}
