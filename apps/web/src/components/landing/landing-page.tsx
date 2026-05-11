import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { MarqueeStrip } from "./marquee-strip";
import { SiteHeader } from "./site-header";

const bento = [
  {
    title: "Profiles that mirror production",
    body: "LOAD, STRESS, SPIKE, and LATENCY curves—tune concurrency, windows, and targets without duct-taping k6 scripts across laptops.",
    tag: "profiles",
    span: "lg:col-span-7",
  },
  {
    title: "Workers that absorb spikes",
    body: "Redis + BullMQ decouple enqueue from execution. Scale consumers horizontally while your API stays responsive.",
    tag: "bullmq",
    span: "lg:col-span-5",
  },
  {
    title: "Tenancy by design",
    body: "Projects, memberships, invitations—test cases never leak across org boundaries.",
    tag: "tenancy",
    span: "lg:col-span-4",
  },
  {
    title: "Summaries worth diffing",
    body: "TestRunSummary persists aggregates and latency bands so you can chart regressions instead of screenshotting Grafana.",
    tag: "mongo",
    span: "lg:col-span-4",
  },
  {
    title: "Inline or queued runs",
    body: "POST /run can execute inline for quick feedback or enqueue for heavy profiles—same contract, two execution paths.",
    tag: "runtime",
    span: "lg:col-span-4",
  },
] as const;

export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-crank-void">
      <SiteHeader />

      <main className="flex-1">
        <Hero />
        <MarqueeStrip />
        <HowItWorks />

        <section
          id="features"
          className="scroll-mt-24 border-t border-white/6 bg-linear-to-b from-crank-depth/90 to-crank-void px-4 py-24 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-crank-accent">
                Capabilities
              </p>
              <h2 className="mt-3 text-3xl font-medium tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
                Everything you need to burn in HTTP APIs—without owning a
                bespoke harness.
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base">
                Opinionated backend primitives for teams who already ship on
                Express and want load testing to feel like the rest of their
                platform: typed, auditable, and boring in the best way.
              </p>
            </div>

            <div className="mt-16 grid gap-4 lg:grid-cols-12">
              {bento.map((f, i) => (
                <article
                  key={f.tag}
                  className={`group relative overflow-hidden rounded-2xl border border-white/6 bg-crank-surface/25 p-6 transition duration-300 hover:border-crank-accent/20 hover:bg-crank-elevated/35 hover:shadow-[0_0_0_1px_rgba(45,212,191,0.06),0_28px_56px_-32px_rgba(0,0,0,0.65)] sm:p-7 ${f.span}`}
                  style={{
                    animation: `fade-up 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${0.06 * i}s both`,
                  }}
                >
                  <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-crank-violet/10 blur-3xl transition duration-500 group-hover:bg-crank-accent/10" />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                        {f.tag}
                      </span>
                      <span
                        className="font-mono text-zinc-700 transition group-hover:text-crank-accent/80"
                        aria-hidden
                      >
                        ─
                      </span>
                    </div>
                    <h3 className="mt-4 text-xl font-medium tracking-tight text-white">
                      {f.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                      {f.body}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/6 px-4 py-20 sm:px-6 lg:px-8">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-crank-border bg-crank-surface/40 px-6 py-14 text-center sm:px-12 sm:py-16">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse 70% 80% at 50% 120%, rgba(45,212,191,0.12), transparent 55%)",
              }}
            />
            <div className="relative">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-crank-violet">
                Next step
              </p>
              <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-medium tracking-tight text-white sm:text-3xl">
                Wire your UI to the same contracts your workers already trust.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm text-zinc-500">
                Auth flows, project scoping, and test-case CRUD are live in the
                API today—this surface is the front door.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a
                  href="https://github.com/codewitgabi/crank-backend"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl border border-crank-border bg-crank-void/80 px-6 py-3 text-sm font-medium text-white transition hover:border-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crank-accent"
                >
                  Clone the monorepo
                </a>
                <a
                  href="#how"
                  className="inline-flex items-center justify-center rounded-xl bg-linear-to-r from-crank-accent to-teal-400 px-6 py-3 text-sm font-medium text-crank-void transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crank-accent"
                >
                  Re-read the flow
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/6 bg-crank-void px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="lg:col-span-2">
            <p className="font-mono text-sm font-semibold text-white">
              crank<span className="text-crank-accent">.</span>
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-500">
              API load testing with queue-backed execution, project isolation,
              and persisted run history—built for teams who treat HTTP as a
              contract.
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
              Stack
            </p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-500">
              <li>Express 5</li>
              <li>MongoDB · Mongoose</li>
              <li>Redis · BullMQ</li>
            </ul>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
              Links
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/codewitgabi/crank-backend"
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-400 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crank-accent"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="text-zinc-400 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crank-accent"
                >
                  Capabilities
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-6xl border-t border-white/6 pt-8 font-mono text-[11px] text-zinc-600">
          © {new Date().getFullYear()} Crank. Load test responsibly.
        </div>
      </footer>
    </div>
  );
}
