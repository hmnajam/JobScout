import type { JobSource, NormalizedJob, SearchQuery } from "./types";

/**
 * Remotive — free remote-job API, no key.
 * https://remotive.com/api/remote-jobs?search=<query>
 */

type RemotiveJob = {
  id: number;
  title: string;
  company_name: string;
  candidate_required_location: string;
  salary: string;
  url: string;
  description: string;
};

const ENDPOINT = "https://remotive.com/api/remote-jobs";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export const remotive: JobSource = {
  slug: "remotive",
  name: "Remotive",
  isConfigured: () => true,
  async fetch(query: SearchQuery): Promise<NormalizedJob[]> {
    const roles = query.roles.length ? query.roles : [""];
    const seen = new Set<number>();
    const out: NormalizedJob[] = [];

    for (const role of roles) {
      const url = new URL(ENDPOINT);
      if (role) url.searchParams.set("search", role);
      url.searchParams.set("limit", String(query.limit));

      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "JobScout/1.0" },
      });
      if (!res.ok) {
        throw new Error(`Remotive ${res.status} ${res.statusText}`);
      }
      const data = (await res.json()) as { jobs?: RemotiveJob[] };

      for (const j of data.jobs ?? []) {
        if (seen.has(j.id)) continue;
        seen.add(j.id);
        out.push({
          title: j.title,
          company: j.company_name,
          location: j.candidate_required_location || null,
          remote: true,
          salaryMin: null,
          salaryMax: null,
          currency: null,
          url: j.url,
          description: j.description ? stripHtml(j.description) : null,
          source: "remotive",
          sourceId: String(j.id),
        });
      }
    }

    return out;
  },
};
