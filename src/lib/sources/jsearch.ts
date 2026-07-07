import { env } from "@/lib/env";
import type { JobSource, NormalizedJob, SearchQuery } from "./types";

/**
 * JSearch (RapidAPI) — aggregates LinkedIn / Indeed / Glassdoor / ZipRecruiter.
 * Requires RAPIDAPI_KEY. Free tier is rate-limited, so we request one page per
 * role and keep the limit modest.
 * https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
 */

type JSearchJob = {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city?: string;
  job_country?: string;
  job_is_remote?: boolean;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
  job_apply_link: string;
  job_description?: string;
};

const HOST = "jsearch.p.rapidapi.com";

export const jsearch: JobSource = {
  slug: "jsearch",
  name: "JSearch (LinkedIn/Indeed)",
  isConfigured: () => Boolean(env.RAPIDAPI_KEY),
  async fetch(query: SearchQuery): Promise<NormalizedJob[]> {
    if (!env.RAPIDAPI_KEY) return [];

    const roles = query.roles.length ? query.roles : ["software engineer"];
    const where = query.locations[0] ?? "";
    const seen = new Set<string>();
    const out: NormalizedJob[] = [];

    for (const role of roles) {
      const q = [role, where].filter(Boolean).join(" in ");
      const url = new URL(`https://${HOST}/search`);
      url.searchParams.set("query", q || role);
      url.searchParams.set("page", "1");
      url.searchParams.set("num_pages", "1");
      if (query.remoteOnly) url.searchParams.set("remote_jobs_only", "true");

      const res = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": HOST,
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        throw new Error(`JSearch ${res.status} ${res.statusText}`);
      }
      const data = (await res.json()) as { data?: JSearchJob[] };

      for (const j of data.data ?? []) {
        if (seen.has(j.job_id)) continue;
        seen.add(j.job_id);
        const loc =
          [j.job_city, j.job_country].filter(Boolean).join(", ") || null;
        out.push({
          title: j.job_title,
          company: j.employer_name,
          location: loc,
          remote: j.job_is_remote ?? null,
          salaryMin: j.job_min_salary ?? null,
          salaryMax: j.job_max_salary ?? null,
          currency: j.job_salary_currency ?? null,
          url: j.job_apply_link,
          description: j.job_description ?? null,
          source: "jsearch",
          sourceId: j.job_id,
        });
        if (out.length >= query.limit) break;
      }
    }

    return out;
  },
};
