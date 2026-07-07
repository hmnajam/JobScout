import type { Application, Job, Match } from "@/lib/db/schema";

/**
 * DB-free job view types + constants. Kept separate from `store.ts` so client
 * components can import them without pulling `better-sqlite3` into the browser
 * bundle.
 */

export type ApplicationStatus = Application["status"];

export const STATUSES: ApplicationStatus[] = [
  "new",
  "interested",
  "drafted",
  "applied",
  "rejected",
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: "New",
  interested: "Interested",
  drafted: "Drafted",
  applied: "Applied",
  rejected: "Rejected",
};

/** A job joined with its match score and tracked application status. */
export type JobWithMatch = {
  job: Job;
  match: Match | null;
  status: ApplicationStatus;
  applicationId: number | null;
};

export type JobFilters = {
  /** Only jobs with a score >= this (0-100). */
  minScore?: number;
  /** Filter to a single application status. */
  status?: ApplicationStatus;
  /** Only remote jobs. */
  remoteOnly?: boolean;
};
