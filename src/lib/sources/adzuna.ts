import { env } from "@/lib/env";
import type { JobSource, NormalizedJob, SearchQuery } from "./types";

/**
 * Adzuna — broad aggregator. Free app id + key.
 * https://developer.adzuna.com/  Country is fixed to "us" for v1.
 */

type AdzunaJob = {
  id: string;
  title: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
  redirect_url: string;
  description?: string;
};

const COUNTRY = "us";

export const adzuna: JobSource = {
  slug: "adzuna",
  name: "Adzuna",
  isConfigured: () => Boolean(env.ADZUNA_APP_ID && env.ADZUNA_APP_KEY),
  async fetch(query: SearchQuery): Promise<NormalizedJob[]> {
    if (!env.ADZUNA_APP_ID || !env.ADZUNA_APP_KEY) return [];

    const roles = query.roles.length ? query.roles : [""];
    const where = query.locations[0] ?? "";
    const seen = new Set<string>();
    const out: NormalizedJob[] = [];

    for (const role of roles) {
      const url = new URL(
        `https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/1`,
      );
      url.searchParams.set("app_id", env.ADZUNA_APP_ID);
      url.searchParams.set("app_key", env.ADZUNA_APP_KEY);
      url.searchParams.set("results_per_page", String(query.limit));
      if (role) url.searchParams.set("what", role);
      if (where) url.searchParams.set("where", where);
      if (query.remoteOnly) url.searchParams.set("what_or", "remote");

      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        throw new Error(`Adzuna ${res.status} ${res.statusText}`);
      }
      const data = (await res.json()) as { results?: AdzunaJob[] };

      for (const j of data.results ?? []) {
        if (seen.has(j.id)) continue;
        seen.add(j.id);
        const loc = j.location?.display_name ?? null;
        out.push({
          title: j.title,
          company: j.company?.display_name ?? "Unknown",
          location: loc,
          remote: loc ? /remote/i.test(loc) : null,
          salaryMin: j.salary_min ? Math.round(j.salary_min) : null,
          salaryMax: j.salary_max ? Math.round(j.salary_max) : null,
          currency: j.salary_min || j.salary_max ? "USD" : null,
          url: j.redirect_url,
          description: j.description ?? null,
          source: "adzuna",
          sourceId: j.id,
        });
      }
    }

    return out;
  },
};
