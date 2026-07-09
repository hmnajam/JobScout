# JobScout

A local-first, model-agnostic **AI job finder + resume studio**, built as a single
Next.js app. It ingests postings from many sources, scores each for fit with an LLM
(and explains why), helps you build and improve a resume, and drafts tailored
applications. It **does not auto-submit** anything — you stay in the loop.

Everything runs on your machine: SQLite for storage, your choice of LLM provider
(including local models via Ollama / LM Studio), and no data leaves your box except
the API calls you configure.

## Features

- **Job finder** — pull postings from Remotive, RemoteOK, Adzuna, JSearch
  (LinkedIn/Indeed/Glassdoor), and public ATS boards (Greenhouse / Lever / Ashby),
  deduped and normalized.
- **AI matching** — a hard filter (location, salary floor, dealbreakers) followed by
  LLM scoring that returns a 0–100 fit score with reasons and concerns.
- **Resume studio** — import a PDF/DOCX resume (LLM extracts it into structured
  sections), edit it, get ATS feedback, and export clean PDF / DOCX.
- **Tailoring + drafting** — per-job resume variants and cover letters grounded in
  your real experience (no fabrication).
- **Scheduling** — run the pipeline manually or on a cron schedule, with a run log.
- **Model-agnostic** — every AI feature goes through one wrapper; switch provider or
  point at a local model in Settings, no code change.

## Requirements

- Node.js 20+
- At least one LLM provider configured (a cloud API key, or a local Ollama / LM
  Studio server). The app boots without one, but AI features need it.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in whatever keys you want (all optional)
npm run db:push              # create the SQLite schema
npm run dev                  # http://localhost:3000
```

Then open **Settings** to pick your LLM provider and set your job criteria
(role targets, locations, salary floor, dealbreakers). From the **Jobs** page,
click **Run search** to fetch and score postings.

## Configuration

### Environment (`.env.local`)

All keys are optional — each feature checks for its own credentials at call time and
degrades gracefully. See [`.env.example`](.env.example) for the full list. Summary:

| Variable | Purpose |
|---|---|
| `DATABASE_PATH` | SQLite file path (default `./jobscout.db`) |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` | Cloud LLM providers |
| `LOCAL_LLM_BASE_URL` / `LOCAL_LLM_API_KEY` | Local OpenAI-compatible server (e.g. `http://localhost:11434/v1`) |
| `RAPIDAPI_KEY` | JSearch (LinkedIn/Indeed/Glassdoor) |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Adzuna aggregator ([free key](https://developer.adzuna.com/)) |
| `ATS_COMPANIES` | ATS boards to poll, e.g. `greenhouse:stripe,lever:netflix,ashby:openai` |

**Provider note:** structured-output tasks (resume import and tailoring) are
unreliable on Gemini's free tier — it's slow and often fails to produce the resume
schema. Use **Anthropic** or **OpenAI** for those; plain-text tasks (cover letters,
scoring) work fine on any provider.

### Runtime config (`jobscout.config.json`)

Provider selection, model ids, and the run schedule are persisted here (gitignored).
You normally edit these through the **Settings** UI rather than by hand.

## Scheduling

Enable scheduled runs in **Settings → Scheduled runs**: pick a preset (hourly, every
6 hours, daily, weekly) or enter a custom cron expression. The scheduler arms at
server boot via `instrumentation.ts` and re-arms immediately when you save — no
restart needed. Runs use your saved job criteria and appear in the run log on the
Jobs page.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run db:push` | Apply the schema to SQLite |
| `npm run db:generate` / `npm run db:migrate` | Generate / run Drizzle migrations |

## Architecture

Single Next.js (App Router) app. Key modules under `src/lib`:

- `llm/` — model-agnostic wrapper over the Vercel AI SDK (`complete` + `extract`),
  with a task→model registry. **Never import a vendor SDK elsewhere.**
- `sources/` — one adapter per job source behind a common `JobSource` interface.
- `matching/` — hard filter + LLM scoring.
- `resume/` — structured resume model, AI edit ops, ATS scoring.
- `drafting/` — cover letter + per-job resume tailoring.
- `export/` — resume → PDF / DOCX.
- `profile/` — resume parsing + profile store.
- `db/` — Drizzle schema + SQLite client.
- `schedule/` — cron scheduler + config (client-safe types split into `types.ts`).

Storage is SQLite via Drizzle ORM (`better-sqlite3`).

## Credits

Built by **Najam** — [najam.pk](https://najam.pk).
