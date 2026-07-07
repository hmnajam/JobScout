import { emptyResume } from "@/lib/resume/schema";
import { getMasterResume } from "@/lib/resume/store";
import { ResumeStudio } from "./ResumeStudio";

export const dynamic = "force-dynamic";

export default async function ResumePage() {
  const master = await getMasterResume();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Resume Studio</h1>
        <p className="text-sm text-muted">
          Import your resume, then refine it into a clean structured document.
        </p>
      </header>

      <ResumeStudio
        resumeId={master?.id ?? null}
        initialContent={master?.content ?? emptyResume()}
      />
    </div>
  );
}
