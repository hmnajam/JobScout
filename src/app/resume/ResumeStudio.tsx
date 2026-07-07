"use client";

import { useRef, useState, useTransition } from "react";
import type {
  ResumeContent,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
} from "@/lib/db/schema";
import type { AtsReview } from "@/lib/resume/ats";
import {
  createBlankResumeAction,
  importResumeAction,
  saveResumeAction,
} from "./actions";
import {
  atsReviewAction,
  improveBulletsAction,
  improveSummaryAction,
  suggestSkillsAction,
} from "./ai-actions";

type Status = { kind: "idle" | "ok" | "error"; message?: string };

export function ResumeStudio({
  resumeId,
  initialContent,
}: {
  resumeId: number | null;
  initialContent: ResumeContent;
}) {
  const [content, setContent] = useState<ResumeContent>(initialContent);
  const [id, setId] = useState<number | null>(resumeId);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [importing, setImporting] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // AI-assist state
  const [busy, setBusy] = useState<string | null>(null);
  const [summarySuggestion, setSummarySuggestion] = useState<string | null>(null);
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);
  const [ats, setAts] = useState<AtsReview | null>(null);

  function patch(update: Partial<ResumeContent>) {
    setContent((c) => ({ ...c, ...update }));
  }

  async function onImproveSummary() {
    setBusy("summary");
    setStatus({ kind: "idle" });
    const res = await improveSummaryAction(content);
    setBusy(null);
    if (res.ok) setSummarySuggestion(res.data);
    else setStatus({ kind: "error", message: res.error });
  }

  async function onSuggestSkills() {
    setBusy("skills");
    setStatus({ kind: "idle" });
    const res = await suggestSkillsAction(content);
    setBusy(null);
    if (res.ok) setSkillSuggestions(res.data);
    else setStatus({ kind: "error", message: res.error });
  }

  async function onImproveBullets(index: number) {
    setBusy(`bullets-${index}`);
    setStatus({ kind: "idle" });
    const res = await improveBulletsAction(content.experience[index]);
    setBusy(null);
    if (res.ok) {
      patch({
        experience: content.experience.map((e, j) =>
          j === index ? { ...e, bullets: res.data } : e,
        ),
      });
    } else {
      setStatus({ kind: "error", message: res.error });
    }
  }

  async function onAtsReview() {
    setBusy("ats");
    setStatus({ kind: "idle" });
    const res = await atsReviewAction(content);
    setBusy(null);
    if (res.ok) setAts(res.data);
    else setStatus({ kind: "error", message: res.error });
  }

  async function onImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setImporting(true);
    setStatus({ kind: "idle" });
    const fd = new FormData();
    fd.set("file", file);
    const res = await importResumeAction(fd);
    setImporting(false);
    if (res.ok) {
      setStatus({ kind: "ok", message: res.message });
      // Reload to pull the freshly extracted content from the server.
      window.location.reload();
    } else {
      setStatus({ kind: "error", message: res.error });
    }
  }

  function onSave() {
    startTransition(async () => {
      const res = id
        ? await saveResumeAction(id, content)
        : await createBlankResumeAction(content);
      if (res.ok) {
        setStatus({ kind: "ok", message: res.message });
        if (!id) window.location.reload();
      } else {
        setStatus({ kind: "error", message: res.error });
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Import */}
      <form onSubmit={onImport} className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            name="file"
            accept=".pdf,.docx,.txt,.md"
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent"
          />
          <button type="submit" disabled={importing} className="btn btn-primary">
            {importing ? "Extracting…" : "Import & extract"}
          </button>
          <span className="text-xs text-muted-2">
            PDF, DOCX, TXT, or MD — parsed and structured by AI.
          </span>
        </div>
      </form>

      {status.kind !== "idle" && (
        <p
          className="text-sm"
          style={{
            color: status.kind === "ok" ? "var(--good)" : "var(--danger)",
          }}
        >
          {status.message}
        </p>
      )}

      {/* Tools: ATS review + export (export needs a saved resume) */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onAtsReview}
          disabled={busy === "ats"}
          className="btn btn-ghost text-accent"
        >
          {busy === "ats" ? "Reviewing…" : "✨ Run ATS review"}
        </button>
        {id ? (
          <>
            <a
              href={`/resume/export?id=${id}&format=pdf`}
              className="btn btn-ghost"
            >
              Export PDF
            </a>
            <a
              href={`/resume/export?id=${id}&format=docx`}
              className="btn btn-ghost"
            >
              Export DOCX
            </a>
          </>
        ) : (
          <span className="text-xs text-muted-2">
            Save the resume to enable export.
          </span>
        )}
      </div>

      {ats && <AtsPanel review={ats} onClose={() => setAts(null)} />}

      {/* Contact */}
      <Section title="Contact">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Name"
            value={content.contact.name}
            onChange={(v) =>
              patch({ contact: { ...content.contact, name: v } })
            }
          />
          <Field
            label="Email"
            value={content.contact.email ?? ""}
            onChange={(v) =>
              patch({ contact: { ...content.contact, email: v } })
            }
          />
          <Field
            label="Phone"
            value={content.contact.phone ?? ""}
            onChange={(v) =>
              patch({ contact: { ...content.contact, phone: v } })
            }
          />
          <Field
            label="Location"
            value={content.contact.location ?? ""}
            onChange={(v) =>
              patch({ contact: { ...content.contact, location: v } })
            }
          />
        </div>
      </Section>

      {/* Summary */}
      <Section
        title="Summary"
        action={
          <AiButton onClick={onImproveSummary} loading={busy === "summary"}>
            ✨ Improve
          </AiButton>
        }
      >
        <TextArea
          value={content.summary ?? ""}
          onChange={(v) => patch({ summary: v })}
          rows={4}
          placeholder="A short professional summary…"
        />
        {summarySuggestion && (
          <Suggestion
            text={summarySuggestion}
            onAccept={() => {
              patch({ summary: summarySuggestion });
              setSummarySuggestion(null);
            }}
            onDismiss={() => setSummarySuggestion(null)}
          />
        )}
      </Section>

      {/* Skills */}
      <Section
        title="Skills"
        action={
          <AiButton onClick={onSuggestSkills} loading={busy === "skills"}>
            ✨ Suggest skills
          </AiButton>
        }
      >
        <TextArea
          value={content.skills.join(", ")}
          onChange={(v) =>
            patch({
              skills: v
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          rows={2}
          placeholder="Comma-separated, e.g. TypeScript, React, Node.js"
        />
        {skillSuggestions.length > 0 && (
          <div
            className="mt-2 flex flex-wrap gap-2 rounded-lg p-3"
            style={{ background: "var(--accent-soft)" }}
          >
            <span className="w-full text-xs text-muted">
              Tap to add suggested skills:
            </span>
            {skillSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  patch({ skills: [...content.skills, s] });
                  setSkillSuggestions((cur) => cur.filter((x) => x !== s));
                }}
                className="rounded-full border border-accent/40 bg-bg-elev px-2.5 py-0.5 text-xs font-medium text-accent transition hover:bg-accent-soft"
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* Experience */}
      <Section
        title="Experience"
        onAdd={() =>
          patch({
            experience: [
              ...content.experience,
              { company: "", title: "", bullets: [] },
            ],
          })
        }
      >
        {content.experience.map((exp, i) => (
          <ExperienceCard
            key={i}
            exp={exp}
            improving={busy === `bullets-${i}`}
            onImprove={() => onImproveBullets(i)}
            onChange={(next) =>
              patch({
                experience: content.experience.map((e, j) =>
                  j === i ? next : e,
                ),
              })
            }
            onRemove={() =>
              patch({
                experience: content.experience.filter((_, j) => j !== i),
              })
            }
          />
        ))}
      </Section>

      {/* Education */}
      <Section
        title="Education"
        onAdd={() =>
          patch({
            education: [...content.education, { school: "" }],
          })
        }
      >
        {content.education.map((ed, i) => (
          <EducationCard
            key={i}
            ed={ed}
            onChange={(next) =>
              patch({
                education: content.education.map((e, j) =>
                  j === i ? next : e,
                ),
              })
            }
            onRemove={() =>
              patch({
                education: content.education.filter((_, j) => j !== i),
              })
            }
          />
        ))}
      </Section>

      {/* Projects */}
      <Section
        title="Projects"
        onAdd={() =>
          patch({
            projects: [...content.projects, { name: "", bullets: [] }],
          })
        }
      >
        {content.projects.map((p, i) => (
          <ProjectCard
            key={i}
            project={p}
            onChange={(next) =>
              patch({
                projects: content.projects.map((e, j) => (j === i ? next : e)),
              })
            }
            onRemove={() =>
              patch({
                projects: content.projects.filter((_, j) => j !== i),
              })
            }
          />
        ))}
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="btn btn-primary px-5 py-2.5 shadow-lg"
        >
          {pending ? "Saving…" : id ? "Save resume" : "Create resume"}
        </button>
      </div>
    </div>
  );
}

// --- Presentational pieces -------------------------------------------------

function Section({
  title,
  onAdd,
  action,
  children,
}: {
  title: string;
  onAdd?: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-2">
          {title}
        </h2>
        <div className="flex items-center gap-4">
          {action}
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="text-sm font-medium text-accent hover:opacity-80"
            >
              + Add
            </button>
          )}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function AiButton({
  onClick,
  loading,
  children,
}: {
  onClick: () => void;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-accent transition hover:bg-accent-soft disabled:opacity-50"
    >
      {loading ? "Thinking…" : children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      />
    </label>
  );
}

function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="input resize-y leading-relaxed"
    />
  );
}

function BulletEditor({
  bullets,
  onChange,
}: {
  bullets: string[];
  onChange: (b: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      {bullets.map((b, i) => (
        <div key={i} className="flex gap-2">
          <textarea
            value={b}
            rows={2}
            onChange={(e) =>
              onChange(bullets.map((x, j) => (j === i ? e.target.value : x)))
            }
            className="input resize-y leading-relaxed"
          />
          <button
            type="button"
            onClick={() => onChange(bullets.filter((_, j) => j !== i))}
            className="shrink-0 text-xs text-muted-2 transition hover:text-danger"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...bullets, ""])}
        className="text-xs font-medium text-accent hover:opacity-80"
      >
        + Add bullet
      </button>
    </div>
  );
}

function Card({
  onRemove,
  children,
}: {
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative rounded-xl border border-border bg-bg-elev/50 p-4">
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-3 top-3 text-xs text-muted-2 transition hover:text-danger"
      >
        Remove
      </button>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ExperienceCard({
  exp,
  improving,
  onImprove,
  onChange,
  onRemove,
}: {
  exp: ResumeExperience;
  improving: boolean;
  onImprove: () => void;
  onChange: (e: ResumeExperience) => void;
  onRemove: () => void;
}) {
  return (
    <Card onRemove={onRemove}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Company"
          value={exp.company}
          onChange={(v) => onChange({ ...exp, company: v })}
        />
        <Field
          label="Title"
          value={exp.title}
          onChange={(v) => onChange({ ...exp, title: v })}
        />
        <Field
          label="Start"
          value={exp.start ?? ""}
          onChange={(v) => onChange({ ...exp, start: v })}
        />
        <Field
          label="End"
          value={exp.end ?? ""}
          onChange={(v) => onChange({ ...exp, end: v })}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">Bullets</span>
        <AiButton onClick={onImprove} loading={improving}>
          ✨ Improve bullets
        </AiButton>
      </div>
      <BulletEditor
        bullets={exp.bullets}
        onChange={(b) => onChange({ ...exp, bullets: b })}
      />
    </Card>
  );
}

function Suggestion({
  text,
  onAccept,
  onDismiss,
}: {
  text: string;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="mt-2 rounded-lg border border-accent/30 p-3 text-sm"
      style={{ background: "var(--accent-soft)" }}
    >
      <p className="mb-2 whitespace-pre-wrap">{text}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onAccept}
          className="text-xs font-medium text-accent hover:underline"
        >
          Use this
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-muted hover:underline"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function AtsPanel({
  review,
  onClose,
}: {
  review: AtsReview;
  onClose: () => void;
}) {
  const scoreColor =
    review.score >= 80
      ? "var(--good)"
      : review.score >= 60
        ? "var(--warn)"
        : "var(--danger)";
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-2">
          ATS review
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted hover:underline"
        >
          Close
        </button>
      </div>
      <p className="text-4xl font-bold tabular-nums" style={{ color: scoreColor }}>
        {review.score}
        <span className="text-base font-normal text-muted-2">/100</span>
      </p>

      {review.strengths.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted">Strengths</p>
          <ul className="mt-1.5 list-disc pl-5 text-sm marker:text-good">
            {review.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {review.issues.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted">Fixes</p>
          <ul className="mt-1.5 space-y-2 text-sm">
            {review.issues.map((iss, i) => {
              const sev =
                iss.severity === "high"
                  ? { background: "var(--danger)", color: "#fff" }
                  : iss.severity === "medium"
                    ? { background: "var(--warn-soft)", color: "var(--warn)" }
                    : { background: "var(--accent-soft)", color: "var(--muted)" };
              return (
                <li key={i}>
                  <span
                    style={sev}
                    className="mr-2 rounded px-1.5 py-0.5 text-[0.7rem] font-medium uppercase"
                  >
                    {iss.severity}
                  </span>
                  <span className="font-medium">{iss.issue}</span> — {iss.fix}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {review.missingKeywords.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted">Missing keywords</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {review.missingKeywords.map((k) => (
              <span key={k} className="chip">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EducationCard({
  ed,
  onChange,
  onRemove,
}: {
  ed: ResumeEducation;
  onChange: (e: ResumeEducation) => void;
  onRemove: () => void;
}) {
  return (
    <Card onRemove={onRemove}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="School"
          value={ed.school}
          onChange={(v) => onChange({ ...ed, school: v })}
        />
        <Field
          label="Degree"
          value={ed.degree ?? ""}
          onChange={(v) => onChange({ ...ed, degree: v })}
        />
        <Field
          label="Field"
          value={ed.field ?? ""}
          onChange={(v) => onChange({ ...ed, field: v })}
        />
        <Field
          label="End"
          value={ed.end ?? ""}
          onChange={(v) => onChange({ ...ed, end: v })}
        />
      </div>
    </Card>
  );
}

function ProjectCard({
  project,
  onChange,
  onRemove,
}: {
  project: ResumeProject;
  onChange: (p: ResumeProject) => void;
  onRemove: () => void;
}) {
  return (
    <Card onRemove={onRemove}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Name"
          value={project.name}
          onChange={(v) => onChange({ ...project, name: v })}
        />
        <Field
          label="URL"
          value={project.url ?? ""}
          onChange={(v) => onChange({ ...project, url: v })}
        />
      </div>
      <TextArea
        value={project.description ?? ""}
        onChange={(v) => onChange({ ...project, description: v })}
        rows={2}
        placeholder="Short description…"
      />
      <BulletEditor
        bullets={project.bullets ?? []}
        onChange={(b) => onChange({ ...project, bullets: b })}
      />
    </Card>
  );
}
