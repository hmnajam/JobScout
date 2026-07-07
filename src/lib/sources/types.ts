/**
 * Ingestion adapter contract.
 *
 * Every source normalizes its postings to `NormalizedJob`. Adapters are
 * best-effort: a `fetch` that throws is caught by the pipeline, logged to the
 * `run`, and does not abort other sources.
 */

/** What to search for — derived from the user's profile. */
export type SearchQuery = {
  /** Role titles / keywords, e.g. ["frontend engineer", "react developer"]. */
  roles: string[];
  /** Free-text locations, e.g. ["Berlin", "Remote (EU)"]. */
  locations: string[];
  /** True when the profile only wants remote roles. */
  remoteOnly: boolean;
  /** Max postings to request per role (adapters may cap lower). */
  limit: number;
};

/** A posting normalized to a common shape before it hits the DB. */
export type NormalizedJob = {
  title: string;
  company: string;
  location: string | null;
  remote: boolean | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  url: string;
  description: string | null;
  /** Source slug, e.g. "remotive". Matches the `source` column. */
  source: string;
  /** Provider's own id for the posting, when available. */
  sourceId: string | null;
};

export type JobSource = {
  /** Stable slug used in the `source` column and run counts. */
  slug: string;
  /** Human-readable name for logs/UI. */
  name: string;
  /**
   * True when this source can run given the current env (e.g. has its API key).
   * Keyless sources always return true.
   */
  isConfigured: () => boolean;
  fetch: (query: SearchQuery) => Promise<NormalizedJob[]>;
};

/**
 * Stable dedup key across sources: `company|title|host`, lowercased and
 * whitespace-collapsed. The same posting surfaced by two aggregators collapses
 * to one row via the unique index on `job.dedupKey`.
 */
export function makeDedupKey(job: {
  company: string;
  title: string;
  url: string;
}): string {
  let host = "";
  try {
    host = new URL(job.url).host.replace(/^www\./, "");
  } catch {
    host = job.url;
  }
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  return `${norm(job.company)}|${norm(job.title)}|${norm(host)}`;
}
