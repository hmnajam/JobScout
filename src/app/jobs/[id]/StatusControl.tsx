"use client";

import { useState, useTransition } from "react";
import {
  type ApplicationStatus,
  STATUS_LABELS,
  STATUSES,
} from "@/lib/jobs/types";
import { setStatusAction } from "../actions";

export function StatusControl({
  jobId,
  initial,
}: {
  jobId: number;
  initial: ApplicationStatus;
}) {
  const [status, setStatus] = useState(initial);
  const [pending, start] = useTransition();

  function change(next: ApplicationStatus) {
    setStatus(next);
    start(async () => {
      await setStatusAction(jobId, next);
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Status</span>
      <select
        value={status}
        disabled={pending}
        onChange={(e) => change(e.target.value as ApplicationStatus)}
        className="input w-auto py-1.5"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </label>
  );
}
