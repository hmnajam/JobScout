import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <section className="text-center">
        <span className="chip mx-auto">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Local-first · model-agnostic
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl bg-gradient-to-br from-fg to-muted bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl">
          Build a great resume, then let AI find the jobs that fit.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-balance text-muted">
          JobScout pulls postings from across the web, scores each one against
          your profile, and explains why it fits — so you spend time applying,
          not searching.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/jobs" className="btn btn-primary">
            Find jobs
          </Link>
          <Link href="/resume" className="btn btn-ghost">
            Open Resume Studio
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        <FeatureCard
          href="/jobs"
          title="Jobs"
          desc="Run a search, then review matches ranked by fit with reasons and concerns."
          icon={
            <path
              d="M4 7h16M4 12h16M4 17h10"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          }
        />
        <FeatureCard
          href="/resume"
          title="Resume Studio"
          desc="Import a PDF or DOCX, refine it with AI, get ATS feedback, and export."
          icon={
            <path
              d="M7 3h7l4 4v14H7V3Zm7 0v4h4M9 13h6M9 17h6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          }
        />
        <FeatureCard
          href="/settings"
          title="Settings"
          desc="Set your job criteria and pick any AI provider — cloud or local."
          icon={
            <>
              <circle cx="12" cy="12" r="3.2" strokeWidth="1.8" />
              <path
                d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </>
          }
        />
      </section>
    </div>
  );
}

function FeatureCard({
  href,
  title,
  desc,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="card card-interactive block p-5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
          {icon}
        </svg>
      </span>
      <h2 className="mt-4 font-medium tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted">{desc}</p>
    </Link>
  );
}
