import { env } from "@/lib/env";
import type { JobSource, NormalizedJob, SearchQuery } from "./types";

/**
 * ATS company boards — Greenhouse, Lever, and Ashby expose public JSON for a
 * company's open roles. The user lists target companies in ATS_COMPANIES as
 * `provider:token` entries (e.g. "greenhouse:stripe,lever:netflix").
 *
 * These return every open role at a company, so we filter by the profile's role
 * keywords client-side.
 */

type AtsEntry = { provider: "greenhouse" | "lever" | "ashby"; token: string };

function parseCompanies(): AtsEntry[] {
  if (!env.ATS_COMPANIES) return [];
  const out: AtsEntry[] = [];
  for (const raw of env.ATS_COMPANIES.split(",")) {
    const [provider, token] = raw.split(":").map((s) => s.trim());
    if (
      (provider === "greenhouse" ||
        provider === "lever" ||
        provider === "ashby") &&
      token
    ) {
      out.push({ provider, token });
    }
  }
  return out;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// --- provider fetchers ------------------------------------------------------

async function fetchGreenhouse(token: string): Promise<NormalizedJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Greenhouse(${token}) ${res.status}`);
  const data = (await res.json()) as {
    jobs?: {
      id: number;
      title: string;
      location?: { name?: string };
      absolute_url: string;
      content?: string;
    }[];
  };
  return (data.jobs ?? []).map((j) => ({
    title: j.title,
    company: token,
    location: j.location?.name ?? null,
    remote: j.location?.name ? /remote/i.test(j.location.name) : null,
    salaryMin: null,
    salaryMax: null,
    currency: null,
    url: j.absolute_url,
    description: j.content ? stripHtml(j.content) : null,
    source: "greenhouse",
    sourceId: String(j.id),
  }));
}

async function fetchLever(token: string): Promise<NormalizedJob[]> {
  const url = `https://api.lever.co/v0/postings/${token}?mode=json`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Lever(${token}) ${res.status}`);
  const data = (await res.json()) as {
    id: string;
    text: string;
    categories?: { location?: string };
    hostedUrl: string;
    descriptionPlain?: string;
    workplaceType?: string;
  }[];
  return data.map((j) => ({
    title: j.text,
    company: token,
    location: j.categories?.location ?? null,
    remote: j.workplaceType ? /remote/i.test(j.workplaceType) : null,
    salaryMin: null,
    salaryMax: null,
    currency: null,
    url: j.hostedUrl,
    description: j.descriptionPlain ?? null,
    source: "lever",
    sourceId: j.id,
  }));
}

async function fetchAshby(token: string): Promise<NormalizedJob[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${token}?includeCompensation=true`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Ashby(${token}) ${res.status}`);
  const data = (await res.json()) as {
    jobs?: {
      id: string;
      title: string;
      location?: string;
      isRemote?: boolean;
      jobUrl: string;
      descriptionPlain?: string;
    }[];
  };
  return (data.jobs ?? []).map((j) => ({
    title: j.title,
    company: token,
    location: j.location ?? null,
    remote: j.isRemote ?? null,
    salaryMin: null,
    salaryMax: null,
    currency: null,
    url: j.jobUrl,
    description: j.descriptionPlain ?? null,
    source: "ashby",
    sourceId: j.id,
  }));
}

async function fetchEntry(entry: AtsEntry): Promise<NormalizedJob[]> {
  switch (entry.provider) {
    case "greenhouse":
      return fetchGreenhouse(entry.token);
    case "lever":
      return fetchLever(entry.token);
    case "ashby":
      return fetchAshby(entry.token);
  }
}

export const atsBoards: JobSource = {
  slug: "ats",
  name: "ATS company boards",
  isConfigured: () => parseCompanies().length > 0,
  async fetch(query: SearchQuery): Promise<NormalizedJob[]> {
    const companies = parseCompanies();
    if (!companies.length) return [];

    const terms = query.roles.map((r) => r.toLowerCase()).filter(Boolean);
    const matches = (title: string) =>
      !terms.length || terms.some((t) => title.toLowerCase().includes(t));

    // Collect per-company; a single failing board is surfaced to the pipeline as
    // an error but must not lose the others.
    const results = await Promise.allSettled(companies.map(fetchEntry));
    const errors: string[] = [];
    const out: NormalizedJob[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        out.push(...r.value.filter((j) => matches(j.title)));
      } else {
        const c = companies[i];
        errors.push(`${c.provider}:${c.token} ${String(r.reason)}`);
      }
    });
    if (errors.length && !out.length) {
      throw new Error(`All ATS boards failed: ${errors.join("; ")}`);
    }
    return out;
  },
};
