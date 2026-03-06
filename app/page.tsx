import Link from "next/link";

const roleEntries = [
  {
    title: "Consumer Home",
    href: "/consumer",
    summary: "AI-first consumer landing with discovery, favorites, and service browsing.",
  },
  {
    title: "Business Dashboard",
    href: "/business",
    summary: "Builder workspace shell for create, test, and publish workflows.",
  },
  {
    title: "Owner Dashboard",
    href: "/owner",
    summary: "Isolated root-level system view for logs, approvals, and platform health.",
  },
];

export default function Home() {
  return (
    <main className="eden-grid flex min-h-screen items-center justify-center px-4 py-8 md:px-8">
      <section className="eden-shell w-full max-w-5xl p-6 md:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-eden-muted">Eden v1</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-eden-ink md:text-4xl">
          Modular AI-First Platform Shell
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-eden-muted md:text-base">
          Select an access layer to open the initial role dashboard shell for Eden v1.
        </p>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {roleEntries.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className="group rounded-xl border border-eden-edge bg-white/80 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-eden-ring hover:bg-eden-accent-soft/40"
            >
              <p className="text-base font-semibold text-eden-ink">{entry.title}</p>
              <p className="mt-2 text-sm text-eden-muted">{entry.summary}</p>
              <p className="mt-3 font-mono text-xs uppercase tracking-[0.18em] text-eden-accent">
                Open Layer
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
