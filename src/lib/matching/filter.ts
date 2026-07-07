import type { Job, Profile } from "@/lib/db/schema";

/**
 * Hard filter — cheap, deterministic, no LLM. Removes jobs that clearly violate
 * the profile's constraints before we spend tokens scoring them.
 *
 * Bias toward keeping: when a job lacks the data to judge a rule (e.g. no salary
 * listed, unknown remote status), the rule passes rather than excludes.
 */

export type FilterRejection = { job: Job; reason: string };

export type FilterResult = {
  passed: Job[];
  rejected: FilterRejection[];
};

export function hardFilter(jobs: Job[], profile: Profile): FilterResult {
  const passed: Job[] = [];
  const rejected: FilterRejection[] = [];

  const dealbreakers = profile.dealbreakers
    .map((d) => d.toLowerCase().trim())
    .filter(Boolean);

  for (const job of jobs) {
    const reason = rejectReason(job, profile, dealbreakers);
    if (reason) rejected.push({ job, reason });
    else passed.push(job);
  }

  return { passed, rejected };
}

function rejectReason(
  job: Job,
  profile: Profile,
  dealbreakers: string[],
): string | null {
  // Remote-only profiles exclude jobs explicitly marked non-remote. Unknown
  // (null) remote status is kept — many postings omit the flag.
  if (profile.remotePref === "remote" && job.remote === false) {
    return "not remote";
  }

  // Salary floor: exclude only when the posting's top of range is below it.
  // Jobs with no salary data are kept.
  if (profile.salaryFloor != null && job.salaryMax != null) {
    if (job.salaryMax < profile.salaryFloor) {
      return `salary below floor (${job.salaryMax} < ${profile.salaryFloor})`;
    }
  }

  // Dealbreaker keywords in title/company/description.
  if (dealbreakers.length) {
    const hay =
      `${job.title} ${job.company} ${job.description ?? ""}`.toLowerCase();
    const hit = dealbreakers.find((d) => hay.includes(d));
    if (hit) return `dealbreaker keyword: "${hit}"`;
  }

  return null;
}
