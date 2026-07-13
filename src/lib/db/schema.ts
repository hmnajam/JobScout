import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * JobScout data model (Postgres via Drizzle).
 *
 * Structured JSON columns (resume sections, arrays of strings) use `jsonb` so the
 * app works with typed objects while Postgres stores them natively. Types for those
 * shapes live alongside each table.
 */

// ---------------------------------------------------------------------------
// profile — the single user's job-search criteria
// ---------------------------------------------------------------------------
export const profile = pgTable("profile", {
  id: serial("id").primaryKey(),
  // Titles/keywords to search sources for, e.g. ["frontend engineer", "react dev"]
  roleTargets: jsonb("role_targets")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  seniority: text("seniority"), // e.g. "senior", "staff"
  locations: jsonb("locations")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  remotePref: text("remote_pref", {
    enum: ["remote", "hybrid", "onsite", "any"],
  })
    .notNull()
    .default("any"),
  salaryFloor: integer("salary_floor"), // annual, in profile currency
  currency: text("currency").notNull().default("USD"),
  dealbreakers: jsonb("dealbreakers")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  // Skills extracted from the master resume, used to sharpen matching.
  skills: jsonb("skills")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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

export const resume = pgTable("resume", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Master resume"),
  // Null for the master resume; set for a variant tailored to a specific job.
  jobId: integer("job_id").references(() => job.id, { onDelete: "set null" }),
  isMaster: boolean("is_master").notNull().default(false),
  content: jsonb("content").$type<ResumeContent>().notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// job — a normalized posting from any source
// ---------------------------------------------------------------------------
export const job = pgTable(
  "job",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    company: text("company").notNull(),
    location: text("location"),
    remote: boolean("remote"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    currency: text("currency"),
    url: text("url").notNull(),
    description: text("description"),
    source: text("source").notNull(), // e.g. "remotive", "jsearch"
    sourceId: text("source_id"), // provider's id for the posting
    // Normalized key for dedup across sources: lower(company|title|url-host).
    dedupKey: text("dedup_key").notNull(),
    fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("job_dedup_key_idx").on(t.dedupKey)],
);

// ---------------------------------------------------------------------------
// match — LLM fit score for a job against the profile
// ---------------------------------------------------------------------------
export const match = pgTable("match", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id")
    .notNull()
    .references(() => job.id, { onDelete: "cascade" }),
  score: doublePrecision("score").notNull(), // 0-100
  reasons: jsonb("reasons")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  concerns: jsonb("concerns")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  model: text("model"), // which model produced the score
  scoredAt: timestamp("scored_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// application — tracked application for a job (drafts only, never auto-submitted)
// ---------------------------------------------------------------------------
export const application = pgTable("application", {
  id: serial("id").primaryKey(),
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
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// run — a pipeline execution log
// ---------------------------------------------------------------------------
export const run = pgTable("run", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
  // Per-source counts, e.g. { remotive: 12, jsearch: 40 }
  sourceCounts: jsonb("source_counts")
    .$type<Record<string, number>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  fetched: integer("fetched").notNull().default(0),
  added: integer("added").notNull().default(0),
  scored: integer("scored").notNull().default(0),
  errors: jsonb("errors")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
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
