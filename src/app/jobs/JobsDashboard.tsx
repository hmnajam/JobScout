"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  type ApplicationStatus,
  type JobWithMatch,
  STATUS_LABELS,
  STATUSES,
} from "@/lib/jobs/types";
import { runSearchAction, setStatusAction } from "./actions";

export function JobsDashboard({
  jobs,
  counts,
  hasProfile,
}: {
  jobs: JobWithMatch[];
  counts: Record<string, number>;
  hasProfile: boolean;
}) {
  const [minScore, setMinScore] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">(
    "all",
  );
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [runMsg, setRunMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    return jobs.filter((r) => {
      // minScore 0 shows everything, including not-yet-scored jobs.
      if (minScore > 0 && (r.match?.score ?? -1) < minScore) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (remoteOnly && r.job.remote !== true) return false;
      return true;
    });
  }, [jobs, minScore, statusFilter, remoteOnly]);

  function runSearch() {
    setRunMsg(null);
    start(async () => {
      const res = await runSearchAction();
      if (!res.ok) {
        setRunMsg(res.error);
        return;
      }
      const r = res.result;
      const parts = [
        `${r.added} new job${r.added === 1 ? "" : "s"}`,
        `${r.scored} scored`,
      ];
      if (r.errors.length) parts.push(`${r.errors.length} source error(s)`);
      setRunMsg(parts.join(" · "));
    });
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runSearch}
          disabled={pending || !hasProfile}
          className="btn btn-primary"
        >
          {pending ? (
            <>
              <Spinner /> Running search…
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="7" strokeWidth="1.8" />
                <path d="m20 20-3-3" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              Run search
            </>
          )}
        </button>
        {!hasProfile && (
          <span className="text-sm text-warn">
            Set your job criteria in{" "}
            <Link href="/settings" className="font-medium underline">
              Settings
            </Link>{" "}
            first.
          </span>
        )}
        {runMsg && <span className="text-sm text-muted">{runMsg}</span>}
      </div>

      {/* Filters */}
      <div className="card mb-4 flex flex-wrap items-center gap-5 px-4 py-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-muted">Min score</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="accent-[var(--accent)]"
          />
          <span className="w-7 tabular-nums font-medium">{minScore}</span>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-muted">Status</span>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ApplicationStatus | "all")
            }
            className="input w-auto py-1"
          >
            <option value="all">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
                {counts[s] ? ` (${counts[s]})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={remoteOnly}
            onChange={(e) => setRemoteOnly(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          <span className="text-muted">Remote only</span>
        </label>

        <span className="ml-auto text-muted-2">
          {filtered.length} of {jobs.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="card grid place-items-center gap-1 border-dashed p-12 text-center">
          <p className="font-medium">
            {jobs.length === 0 ? "No jobs yet" : "No matches"}
          </p>
          <p className="text-sm text-muted">
            {jobs.length === 0
              ? "Run a search to fetch and score postings."
              : "Try loosening the filters above."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((r) => (
            <JobRow key={r.job.id} row={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function JobRow({ row }: { row: JobWithMatch }) {
  const [status, setStatus] = useState(row.status);
  const [pending, start] = useTransition();
  const score = row.match?.score;

  function change(next: ApplicationStatus) {
    setStatus(next);
    start(async () => {
      await setStatusAction(row.job.id, next);
    });
  }

  return (
    <li className="card card-interactive flex items-center gap-4 p-3.5">
      <ScoreBadge score={score} />
      <Link href={`/jobs/${row.job.id}`} className="min-w-0 flex-1">
        <span className="block truncate font-medium tracking-tight">
          {row.job.title}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted">
          <span className="truncate">{row.job.company}</span>
          {row.job.location && (
            <span className="truncate text-muted-2">· {row.job.location}</span>
          )}
          {row.job.remote && <span className="chip py-0.5">Remote</span>}
          <span className="text-muted-2">· {row.job.source}</span>
        </span>
      </Link>
      <select
        value={status}
        disabled={pending}
        onChange={(e) => change(e.target.value as ApplicationStatus)}
        className="input w-auto py-1.5 text-xs"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </li>
  );
}

function ScoreBadge({ score }: { score?: number }) {
  if (score == null) {
    return (
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-bg-elev text-xs text-muted-2">
        —
      </span>
    );
  }
  const style =
    score >= 75
      ? { background: "var(--good-soft)", color: "var(--good)" }
      : score >= 50
        ? { background: "var(--warn-soft)", color: "var(--warn)" }
        : { background: "var(--accent-soft)", color: "var(--muted)" };
  return (
    <span
      style={style}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-semibold tabular-nums"
    >
      {score}
    </span>
  );
}
