import type { JobSource, NormalizedJob, SearchQuery } from "./types";

/**
 * RemoteOK — free remote-job API, no key.
 * https://remoteok.com/api returns the full feed (first element is metadata).
 * There's no server-side search, so we filter role keywords client-side.
 */

type RemoteOkJob = {
  id?: string;
  slug?: string;
  position?: string;
  company?: string;
  location?: string;
  tags?: string[];
  salary_min?: number;
  salary_max?: number;
  url?: string;
  description?: string;
  // Metadata element (first item) has `legal` instead of job fields.
  legal?: string;
};

const ENDPOINT = "https://remoteok.com/api";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const remoteok: JobSource = {
  slug: "remoteok",
  name: "RemoteOK",
  isConfigured: () => true,
  async fetch(query: SearchQuery): Promise<NormalizedJob[]> {
    const res = await fetch(ENDPOINT, {
      headers: { Accept: "application/json", "User-Agent": "JobScout/1.0" },
    });
    if (!res.ok) {
      throw new Error(`RemoteOK ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as RemoteOkJob[];

    const terms = query.roles.map((r) => r.toLowerCase()).filter(Boolean);
    const matches = (j: RemoteOkJob) => {
      if (!terms.length) return true;
      const hay = `${j.position ?? ""} ${(j.tags ?? []).join(" ")}`.toLowerCase();
      return terms.some((t) => hay.includes(t));
    };

    const out: NormalizedJob[] = [];
    for (const j of data) {
      if (j.legal || !j.position || !j.company || !j.url) continue; // skip metadata / incomplete
      if (!matches(j)) continue;
      out.push({
        title: j.position,
        company: j.company,
        location: j.location || null,
        remote: true,
        salaryMin: j.salary_min ?? null,
        salaryMax: j.salary_max ?? null,
        currency: j.salary_min ? "USD" : null,
        url: j.url,
        description: j.description ? stripHtml(j.description) : null,
        source: "remoteok",
        sourceId: j.id ?? j.slug ?? null,
      });
      if (out.length >= query.limit) break;
    }

    return out;
  },
};
