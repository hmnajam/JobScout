"use client";

import { useState, useTransition } from "react";
import type { LlmConfig, Provider } from "@/lib/llm/config";
import type { ProfileInput } from "@/lib/profile/store";
import { type ScheduleConfig, SCHEDULE_PRESETS } from "@/lib/schedule/types";
import {
  saveLlmConfigAction,
  saveProfileAction,
  saveScheduleAction,
} from "./actions";

const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI (GPT)",
  google: "Google (Gemini)",
  local: "Local (Ollama / LM Studio)",
};

type Availability = Record<Provider, boolean>;

export function SettingsForm({
  llm: initialLlm,
  availability,
  schedule: initialSchedule,
  profile: initialProfile,
}: {
  llm: LlmConfig;
  availability: Availability;
  schedule: ScheduleConfig;
  profile: ProfileInput | null;
}) {
  return (
    <div className="space-y-6">
      <ModelSection llm={initialLlm} availability={availability} />
      <ProfileSection profile={initialProfile} />
      <ScheduleSection schedule={initialSchedule} />
    </div>
  );
}

// --- Scheduling -------------------------------------------------------------

function ScheduleSection({ schedule }: { schedule: ScheduleConfig }) {
  const [enabled, setEnabled] = useState(schedule.enabled);
  const [cronExpr, setCronExpr] = useState(schedule.cron);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const isPreset = SCHEDULE_PRESETS.some((p) => p.cron === cronExpr);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await saveScheduleAction({ enabled, cron: cronExpr });
      setMsg(res.ok ? res.message : res.error);
    });
  }

  return (
    <section className="card p-6">
      <SectionHeader
        title="Scheduled runs"
        desc="Run the search pipeline automatically on a schedule. Runs use your saved job criteria and appear in the run log on the Jobs page."
      />

      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        <span className="text-sm font-medium">Enable scheduled runs</span>
      </label>

      <div className={enabled ? "mt-4" : "mt-4 opacity-50"}>
        <span className="label">Frequency</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {SCHEDULE_PRESETS.map((p) => {
            const selected = cronExpr === p.cron;
            return (
              <button
                key={p.cron}
                type="button"
                disabled={!enabled}
                onClick={() => setCronExpr(p.cron)}
                className={`card p-3 text-left text-sm transition ${
                  selected ? "ring-2 ring-[var(--accent)]" : "card-interactive"
                }`}
              >
                <span className="font-medium">{p.label}</span>
                <span className="block font-mono text-xs text-muted-2">
                  {p.cron}
                </span>
              </button>
            );
          })}
        </div>

        <label className="mt-3 block">
          <span className="label">
            Custom cron expression{isPreset ? " (or pick a preset above)" : ""}
          </span>
          <input
            value={cronExpr}
            disabled={!enabled}
            onChange={(e) => setCronExpr(e.target.value)}
            placeholder="0 8 * * *"
            className="input font-mono"
          />
        </label>
      </div>

      <SaveBar
        label="Save schedule"
        pending={pending}
        msg={msg}
        onSave={save}
      />
    </section>
  );
}

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-medium tracking-tight">{title}</h2>
      <p className="mt-0.5 text-sm text-muted">{desc}</p>
    </div>
  );
}

function SaveBar({
  label,
  pending,
  msg,
  onSave,
}: {
  label: string;
  pending: boolean;
  msg: string | null;
  onSave: () => void;
}) {
  return (
    <div className="mt-6 flex items-center gap-3">
      <button
        type="button"
        onClick={onSave}
        disabled={pending}
        className="btn btn-primary"
      >
        {pending ? "Saving…" : label}
      </button>
      {msg && <span className="text-sm text-muted">{msg}</span>}
    </div>
  );
}

// --- Model / provider config ----------------------------------------------

function ModelSection({
  llm: initial,
  availability,
}: {
  llm: LlmConfig;
  availability: Availability;
}) {
  const [provider, setProvider] = useState<Provider>(initial.provider);
  const [fast, setFast] = useState(initial.models.fast ?? "");
  const [quality, setQuality] = useState(initial.models.quality ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setMsg(null);
    start(async () => {
      const res = await saveLlmConfigAction({
        provider,
        models: {
          fast: fast.trim() || undefined,
          quality: quality.trim() || undefined,
        },
      });
      setMsg(res.ok ? res.message : res.error);
    });
  }

  return (
    <section className="card p-6">
      <SectionHeader
        title="AI model"
        desc="Every AI feature runs through the provider you pick here — switch to a local model for privacy or cost. Leave model ids blank for sensible defaults."
      />

      <div className="grid gap-2.5 sm:grid-cols-2">
        {(Object.keys(PROVIDER_LABELS) as Provider[]).map((p) => {
          const selected = provider === p;
          const ok = availability[p];
          return (
            <button
              key={p}
              type="button"
              onClick={() => setProvider(p)}
              className={`card flex items-center justify-between gap-3 p-3.5 text-left transition ${
                selected
                  ? "ring-2 ring-[var(--accent)]"
                  : "card-interactive"
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full border ${
                    selected
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border-strong"
                  }`}
                >
                  {selected && (
                    <span className="h-2 w-2 rounded-full bg-accent-fg" />
                  )}
                </span>
                <span className="text-sm font-medium">
                  {PROVIDER_LABELS[p]}
                </span>
              </span>
              <span
                className="chip"
                style={
                  ok
                    ? { background: "var(--good-soft)", color: "var(--good)", borderColor: "transparent" }
                    : undefined
                }
              >
                {ok ? "configured" : "no credentials"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextInput
          label="Fast model id (scoring)"
          value={fast}
          onChange={setFast}
          placeholder="default"
        />
        <TextInput
          label="Quality model id (resume, drafting)"
          value={quality}
          onChange={setQuality}
          placeholder="default"
        />
      </div>

      <SaveBar
        label="Save model settings"
        pending={pending}
        msg={msg}
        onSave={save}
      />
    </section>
  );
}

// --- Job criteria (profile) -----------------------------------------------

function ProfileSection({ profile }: { profile: ProfileInput | null }) {
  const [roleTargets, setRoleTargets] = useState(
    (profile?.roleTargets ?? []).join(", "),
  );
  const [seniority, setSeniority] = useState(profile?.seniority ?? "");
  const [locations, setLocations] = useState(
    (profile?.locations ?? []).join(", "),
  );
  const [remotePref, setRemotePref] = useState<ProfileInput["remotePref"]>(
    profile?.remotePref ?? "any",
  );
  const [salaryFloor, setSalaryFloor] = useState(
    profile?.salaryFloor ? String(profile.salaryFloor) : "",
  );
  const [currency, setCurrency] = useState(profile?.currency ?? "USD");
  const [dealbreakers, setDealbreakers] = useState(
    (profile?.dealbreakers ?? []).join(", "),
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toList = (s: string) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await saveProfileAction({
        roleTargets: toList(roleTargets),
        seniority: seniority.trim() || null,
        locations: toList(locations),
        remotePref,
        salaryFloor: salaryFloor ? Number(salaryFloor) : null,
        currency: currency.trim() || "USD",
        dealbreakers: toList(dealbreakers),
      });
      setMsg(res.ok ? res.message : res.error);
    });
  }

  return (
    <section className="card p-6">
      <SectionHeader
        title="Job criteria"
        desc="What the agent searches for and how it filters and ranks matches."
      />

      <div className="space-y-4">
        <TextInput
          label="Role targets (comma-separated)"
          value={roleTargets}
          onChange={setRoleTargets}
          placeholder="frontend engineer, react developer"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextInput
            label="Seniority"
            value={seniority}
            onChange={setSeniority}
            placeholder="senior"
          />
          <label className="block">
            <span className="label">Remote preference</span>
            <select
              value={remotePref}
              onChange={(e) =>
                setRemotePref(e.target.value as ProfileInput["remotePref"])
              }
              className="input"
            >
              <option value="any">Any</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
            </select>
          </label>
        </div>
        <TextInput
          label="Locations (comma-separated)"
          value={locations}
          onChange={setLocations}
          placeholder="Berlin, Remote (EU)"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextInput
            label="Salary floor (annual)"
            value={salaryFloor}
            onChange={setSalaryFloor}
            placeholder="90000"
          />
          <TextInput label="Currency" value={currency} onChange={setCurrency} />
        </div>
        <TextInput
          label="Dealbreakers (comma-separated keywords)"
          value={dealbreakers}
          onChange={setDealbreakers}
          placeholder="on-call, PHP, relocation required"
        />
      </div>

      <SaveBar
        label="Save job criteria"
        pending={pending}
        msg={msg}
        onSave={save}
      />
    </section>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      />
    </label>
  );
}
