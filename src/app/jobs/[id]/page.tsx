import Link from "next/link";
import { notFound } from "next/navigation";
import { getJobDetail } from "@/lib/jobs/store";
import { StatusControl } from "./StatusControl";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isInteger(jobId)) notFound();

  const detail = await getJobDetail(jobId);
  if (!detail) notFound();

  const { job, match } = detail;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-fg"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
          <path d="m15 6-6 6 6 6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        All jobs
      </Link>

      <header className="card mt-4 flex items-start justify-between gap-4 p-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
            <span className="font-medium text-fg">{job.company}</span>
            {job.location && <span>· {job.location}</span>}
            {job.remote && <span className="chip">Remote</span>}
          </p>
          {(job.salaryMin || job.salaryMax) && (
            <p className="mt-2 text-sm text-muted">
              {job.salaryMin ?? "?"}–{job.salaryMax ?? "?"} {job.currency ?? ""}
            </p>
          )}
        </div>
        {match && (
          <div className="shrink-0 text-right">
            <div className="text-4xl font-bold tabular-nums text-accent">
              {match.score}
              <span className="text-base font-normal text-muted-2">/100</span>
            </div>
            <div className="text-xs uppercase tracking-wide text-muted-2">
              fit score
            </div>
          </div>
        )}
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatusControl jobId={job.id} initial={detail.status} />
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost"
        >
          View original
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor">
            <path d="M7 17 17 7M9 7h8v8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <span className="text-xs text-muted-2">Source: {job.source}</span>
      </div>

      {match && (match.reasons.length > 0 || match.concerns.length > 0) && (
        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {match.reasons.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-good">
                <span className="grid h-5 w-5 place-items-center rounded-full" style={{ background: "var(--good-soft)" }}>
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                    <path d="m5 12 5 5L20 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Why it fits
              </h2>
              <ul className="space-y-2 text-sm">
                {match.reasons.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-good" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {match.concerns.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-warn">
                <span className="grid h-5 w-5 place-items-center rounded-full" style={{ background: "var(--warn-soft)" }}>
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor">
                    <path d="M12 8v5M12 16.5v.5" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </span>
                Concerns
              </h2>
              <ul className="space-y-2 text-sm">
                {match.concerns.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {job.description && (
        <section className="card mt-4 p-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-2">
            Description
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg/85">
            {job.description}
          </p>
        </section>
      )}
    </div>
  );
}
