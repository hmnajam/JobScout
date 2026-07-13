import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runPipeline } from "@/lib/pipeline";

/**
 * Vercel Cron entry point. On hosted deploys the long-running node-cron
 * scheduler can't run (serverless functions don't stay alive), so scheduled
 * runs are driven by Vercel Cron hitting this route on the schedule declared in
 * `vercel.json`.
 *
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. We require it so the
 * endpoint can't be triggered by anyone who finds the URL. If CRON_SECRET is
 * unset (e.g. local), the guard is skipped.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300; // pipeline + LLM scoring can be slow

export async function GET(request: Request) {
  if (env.CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runPipeline("cron");
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pipeline failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
