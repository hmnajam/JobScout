import { listJobs, statusCounts } from "@/lib/jobs/store";
import { getProfile } from "@/lib/profile/store";
import { JobsDashboard } from "./JobsDashboard";
import { RunLog } from "./RunLog";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const [jobs, counts, profile] = await Promise.all([
    listJobs(),
    statusCounts(),
    getProfile(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
        <p className="text-sm text-muted">
          Ranked by fit. Run a search to fetch and score new postings.
        </p>
      </header>

      <JobsDashboard
        jobs={jobs}
        counts={counts}
        hasProfile={Boolean(profile)}
      />

      <RunLog />
    </div>
  );
}
