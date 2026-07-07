import { sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * JobScout data model (SQLite via Drizzle).
 *
 * Structured JSON columns (resume sections, arrays of strings) are stored as text
 * with `{ mode: "json" }` so the app works with typed objects while SQLite stores
 * a serialized blob. Types for those shapes live alongside each table.
 */

// ---------------------------------------------------------------------------
// profile — the single user's job-search criteria
// ---------------------------------------------------------------------------
export const profile = sqliteTable("profile", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Titles/keywords to search sources for, e.g. ["frontend engineer", "react dev"]
  roleTargets: text("role_targets", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  seniority: text("seniority"), // e.g. "senior", "staff"
  locations: text("locations", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  remotePref: text("remote_pref", {
    enum: ["remote", "hybrid", "onsite", "any"],
  })
    .notNull()
    .default("any"),
  salaryFloor: integer("salary_floor"), // annual, in profile currency
  currency: text("currency").notNull().default("USD"),
  dealbreakers: text("dealbreakers", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  // Skills extracted from the master resume, used to sharpen matching.
  skills: text("skills", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ---------------------------------------------------------------------------
// resume — master resume + tailored per-job variants (structured JSON)
// ---------------------------------------------------------------------------
export type ResumeContact = {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: { label: string; url: string }[];
};

export type ResumeExperience = {
  company: string;
  title: string;
  location?: string;
  start?: string;
  end?: string; // omit or "Present"
  bullets: string[];
};

export type ResumeEducation = {
  school: string;
  degree?: string;
  field?: string;
  start?: string;
  end?: string;
  details?: string;
};

export type ResumeProject = {
  name: string;
  description?: string;
  url?: string;
  bullets?: string[];
};

export type ResumeContent = {
  contact: ResumeContact;
  summary?: string;
  experience: ResumeExperience[];
  skills: string[];
  education: ResumeEducation[];
  projects: ResumeProject[];
};

export const resume = sqliteTable("resume", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().default("Master resume"),
  // Null for the master resume; set for a variant tailored to a specific job.
  jobId: integer("job_id").references(() => job.id, { onDelete: "set null" }),
  isMaster: integer("is_master", { mode: "boolean" }).notNull().default(false),
  content: text("content", { mode: "json" }).$type<ResumeContent>().notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ---------------------------------------------------------------------------
// job — a normalized posting from any source
// ---------------------------------------------------------------------------
export const job = sqliteTable(
  "job",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    company: text("company").notNull(),
    location: text("location"),
    remote: integer("remote", { mode: "boolean" }),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    currency: text("currency"),
    url: text("url").notNull(),
    description: text("description"),
    source: text("source").notNull(), // e.g. "remotive", "jsearch"
    sourceId: text("source_id"), // provider's id for the posting
    // Normalized key for dedup across sources: lower(company|title|url-host).
    dedupKey: text("dedup_key").notNull(),
    fetchedAt: integer("fetched_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("job_dedup_key_idx").on(t.dedupKey)],
);

// ---------------------------------------------------------------------------
// match — LLM fit score for a job against the profile
// ---------------------------------------------------------------------------
export const match = sqliteTable("match", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: integer("job_id")
    .notNull()
    .references(() => job.id, { onDelete: "cascade" }),
  score: real("score").notNull(), // 0-100
  reasons: text("reasons", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  concerns: text("concerns", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  model: text("model"), // which model produced the score
  scoredAt: integer("scored_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ---------------------------------------------------------------------------
// application — tracked application for a job (drafts only, never auto-submitted)
// ---------------------------------------------------------------------------
export const application = sqliteTable("application", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: integer("job_id")
    .notNull()
    .references(() => job.id, { onDelete: "cascade" }),
  resumeId: integer("resume_id").references(() => resume.id, {
    onDelete: "set null",
  }),
  coverLetter: text("cover_letter"),
  status: text("status", {
    enum: ["new", "interested", "drafted", "applied", "rejected"],
  })
    .notNull()
    .default("new"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ---------------------------------------------------------------------------
// run — a pipeline execution log
// ---------------------------------------------------------------------------
export const run = sqliteTable("run", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: integer("started_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  // Per-source counts, e.g. { remotive: 12, jsearch: 40 }
  sourceCounts: text("source_counts", { mode: "json" })
    .$type<Record<string, number>>()
    .notNull()
    .default(sql`'{}'`),
  fetched: integer("fetched").notNull().default(0),
  added: integer("added").notNull().default(0),
  scored: integer("scored").notNull().default(0),
  errors: text("errors", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  trigger: text("trigger", { enum: ["manual", "cron"] })
    .notNull()
    .default("manual"),
});

export type Profile = typeof profile.$inferSelect;
export type Resume = typeof resume.$inferSelect;
export type Job = typeof job.$inferSelect;
export type Match = typeof match.$inferSelect;
export type Application = typeof application.$inferSelect;
export type Run = typeof run.$inferSelect;
