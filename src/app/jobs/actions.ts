"use server";

import { revalidatePath } from "next/cache";
import { type ApplicationStatus, setJobStatus, STATUSES } from "@/lib/jobs/store";
import { type PipelineResult, runPipeline } from "@/lib/pipeline";

export type RunResult =
  | { ok: true; result: PipelineResult }
  | { ok: false; error: string };

export async function runSearchAction(): Promise<RunResult> {
  try {
    const result = await runPipeline("manual");
    revalidatePath("/jobs");
    return { ok: true, result };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Run failed.",
    };
  }
}

export async function setStatusAction(
  jobId: number,
  status: ApplicationStatus,
): Promise<{ ok: boolean; error?: string }> {
  if (!STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status." };
  }
  try {
    await setJobStatus(jobId, status);
    revalidatePath("/jobs");
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Update failed.",
    };
  }
}
