"use client";

import { useState, useTransition } from "react";
import {
  draftCoverLetterAction,
  saveCoverLetterAction,
  tailorResumeAction,
} from "./actions";

type VariantInfo = { id: number; name: string } | null;

function Spinner() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 animate-spin"
      fill="none"
      stroke="currentColor"
    >
      <circle cx="12" cy="12" r="9" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Per-job drafting UI: generate a tailored resume variant and a cover letter,
 * both grounded in the master resume + this posting. Drafts only — the user
 * reviews, edits, and exports; nothing is ever submitted.
 */
export function DraftPanel({
  jobId,
  hasMaster,
  initialVariant,
  initialCoverLetter,
}: {
  jobId: number;
  hasMaster: boolean;
  initialVariant: VariantInfo;
  initialCoverLetter: string | null;
}) {
  const [variant, setVariant] = useState<VariantInfo>(initialVariant);
  const [letter, setLetter] = useState(initialCoverLetter ?? "");
  const [savedLetter, setSavedLetter] = useState(initialCoverLetter ?? "");
  const [msg, setMsg] = useState<string | null>(null);

  const [tailoring, startTailor] = useTransition();
  const [drafting, startDraft] = useTransition();
  const [saving, startSave] = useTransition();

  const dirty = letter.trim() !== savedLetter.trim();

  function tailor() {
    setMsg(null);
    startTailor(async () => {
      const res = await tailorResumeAction(jobId);
      if (res.ok) {
        setVariant({ id: res.variantId, name: "Tailored resume" });
      } else {
        setMsg(res.error);
      }
    });
  }

  function draft() {
    setMsg(null);
    startDraft(async () => {
      const res = await draftCoverLetterAction(jobId);
      if (res.ok) {
        setLetter(res.coverLetter);
        setSavedLetter(res.coverLetter);
      } else {
        setMsg(res.error);
      }
    });
  }

  function save() {
    setMsg(null);
    startSave(async () => {
      const res = await saveCoverLetterAction(jobId, letter);
      if (res.ok) setSavedLetter(letter);
      else setMsg(res.error ?? "Save failed.");
    });
  }

  return (
    <section className="card mt-4 p-6">
      <h2 className="text-lg font-medium tracking-tight">Application drafts</h2>
      <p className="mt-0.5 text-sm text-muted">
        Generate a tailored resume and cover letter for this role. Everything
        stays a draft you review — nothing is submitted.
      </p>

      {!hasMaster && (
        <p
          className="mt-4 rounded-[var(--radius)] px-4 py-3 text-sm"
          style={{ background: "var(--warn-soft)", color: "var(--warn)" }}
        >
          Create a master resume in the{" "}
          <a href="/resume" className="underline">
            Resume Studio
          </a>{" "}
          first — drafts build on it.
        </p>
      )}

      {/* Tailored resume ----------------------------------------------------- */}
      <div className="mt-5 border-t border-border pt-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={tailor}
            disabled={!hasMaster || tailoring}
            className="btn btn-primary"
          >
            {tailoring && <Spinner />}
            {tailoring
              ? "Tailoring…"
              : variant
                ? "Re-tailor resume"
                : "Tailor resume to this job"}
          </button>
          {variant && !tailoring && (
            <span className="text-sm text-good">✓ Variant ready</span>
          )}
        </div>

        {variant && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Export tailored resume:</span>
            <a
              className="btn btn-ghost"
              href={`/resume/export?id=${variant.id}&format=pdf`}
            >
              PDF
            </a>
            <a
              className="btn btn-ghost"
              href={`/resume/export?id=${variant.id}&format=docx`}
            >
              DOCX
            </a>
          </div>
        )}
      </div>

      {/* Cover letter -------------------------------------------------------- */}
      <div className="mt-5 border-t border-border pt-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={draft}
            disabled={!hasMaster || drafting}
            className="btn btn-primary"
          >
            {drafting && <Spinner />}
            {drafting
              ? "Drafting…"
              : savedLetter
                ? "Regenerate cover letter"
                : "Draft cover letter"}
          </button>
        </div>

        {(letter || savedLetter) && (
          <div className="mt-3">
            <textarea
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              rows={12}
              className="input font-sans leading-relaxed"
              placeholder="Your cover letter draft…"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={save}
                disabled={saving || !dirty}
                className="btn btn-ghost"
              >
                {saving ? "Saving…" : dirty ? "Save edits" : "Saved"}
              </button>
            </div>
          </div>
        )}
      </div>

      {msg && (
        <p className="mt-4 text-sm" style={{ color: "var(--danger)" }}>
          {msg}
        </p>
      )}
    </section>
  );
}
