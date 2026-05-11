import { TerminalPreview } from "./terminal-preview";

const profiles = ["LOAD", "STRESS", "SPIKE", "LATENCY"] as const;

const metrics = [
  { label: "Peak RPS (sim)", value: "12.4k" },
  { label: "p99 latency", value: "186ms" },
  { label: "Failed reqs", value: "0" },
] as const;

const pipeline = [
  { abbr: "HTTP", detail: "POST /run" },
  { abbr: "202", detail: "Accepted" },
  { abbr: "Q", detail: "Redis queue" },
  { abbr: "W", detail: "BullMQ worker" },
  { abbr: "DB", detail: "Summary write" },
] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-12 sm:px-6 sm:pb-32 sm:pt-16 lg:px-8 lg:pt-20">
      {/* Noise */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      {/* Radial vignette */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(45,212,191,0.14),transparent_55%)]"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.32] animate-grid-drift"
        style={{
          backgroundImage: `
            linear-gradient(rgba(45, 212, 191, 0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(45, 212, 191, 0.055) 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px",
        }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute -left-1/3 top-[-10%] h-[min(85vw,560px)] w-[min(85vw,560px)] rounded-full bg-crank-accent/18 blur-[120px] animate-aurora"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-1/4 bottom-[-20%] h-[min(70vw,480px)] w-[min(70vw,480px)] rounded-full bg-crank-violet/22 blur-[110px] animate-aurora"
        style={{ animationDelay: "-5s" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[40%] h-72 w-72 -translate-x-1/2 rounded-full bg-crank-rose/8 blur-[90px] animate-shimmer"
        aria-hidden
      />

      {/* Diagonal accent */}
      <div
        className="pointer-events-none absolute -left-32 top-24 h-px w-[140%] rotate-[-8deg] bg-linear-to-r from-transparent via-crank-accent/25 to-transparent sm:top-32"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-20">
          <div>
            <div className="mb-8 inline-flex items-center gap-3 opacity-0 animate-fade-up">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/50" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
              </span>
              <span className="font-mono text-[11px] tracking-[0.12em] text-zinc-500">
                MULTI-TENANT · QUEUE-FIRST LOAD TESTING
              </span>
            </div>

            <h1 className="opacity-0 text-balance text-[2.35rem] font-medium leading-[1.05] tracking-[-0.02em] text-white sm:text-5xl lg:text-[3.5rem] xl:text-[3.75rem] animate-fade-up-delayed">
              Turn HTTP chaos into{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-linear-to-r from-crank-accent via-teal-200 to-crank-violet bg-clip-text text-transparent">
                  measurable
                </span>
                <span
                  className="absolute -inset-x-1 -bottom-1 z-0 h-3 rounded-sm bg-crank-accent/15 blur-sm"
                  aria-hidden
                />
              </span>{" "}
              signal.
            </h1>

            <p className="mt-8 max-w-xl border-l-2 border-crank-accent/50 pl-5 opacity-0 text-pretty text-base leading-[1.65] text-zinc-400 sm:text-lg animate-fade-up-delayed-2">
              Crank is the control plane for API load tests: define cases per
              project, enqueue runs on{" "}
              <span className="font-mono text-zinc-300">BullMQ</span>, and
              persist aggregates to{" "}
              <span className="font-mono text-zinc-300">MongoDB</span>—so every
              deploy gets a paper trail, not a prayer.
            </p>

            <div className="mt-10 flex flex-wrap gap-3 opacity-0 animate-fade-up-delayed-3">
              <a
                href="#features"
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-xl px-7 py-3.5 text-sm font-medium text-crank-void focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crank-accent"
              >
                <span className="absolute inset-0 bg-linear-to-r from-crank-accent to-teal-400 transition group-hover:brightness-110" />
                <span className="relative">Open capabilities</span>
              </a>
              <a
                href="https://github.com/codewitgabi/crank-backend"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-crank-border bg-crank-surface/60 px-6 py-3.5 text-sm font-medium text-zinc-200 backdrop-blur transition hover:border-zinc-500 hover:bg-crank-elevated/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
              >
                <span className="font-mono text-xs text-zinc-500">git</span>
                View repository
              </a>
            </div>

            <div
              className="mt-12 grid max-w-xl grid-cols-3 gap-3 opacity-0 sm:gap-4"
              style={{
                animation: `fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.44s both`,
              }}
            >
              {metrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl border border-white/6 bg-crank-surface/40 px-3 py-3 text-center backdrop-blur-sm transition hover:border-crank-accent/20 hover:bg-crank-elevated/50 sm:px-4 sm:py-4"
                >
                  <p className="font-mono text-lg font-medium tabular-nums text-white sm:text-xl">
                    {m.value}
                  </p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-zinc-600 sm:text-[10px]">
                    {m.label}
                  </p>
                </div>
              ))}
            </div>

            <div
              className="mt-10 opacity-0"
              style={{
                animation: `fade-up 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.52s both`,
              }}
            >
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                Load profiles
              </p>
              <ul
                className="flex flex-wrap gap-2"
                aria-label="Load profile types"
              >
                {profiles.map((p) => (
                  <li key={p}>
                    <span className="inline-flex cursor-default items-center rounded-lg border border-crank-border bg-crank-void/60 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 transition hover:border-crank-violet/35 hover:text-zinc-200">
                      {p}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pipeline strip */}
            <div
              className="mt-12 opacity-0"
              style={{
                animation: `fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.58s both`,
              }}
            >
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                Request path
              </p>
              <div className="flex flex-wrap items-center gap-1 sm:gap-0">
                {pipeline.map((node, i) => (
                  <div key={node.abbr} className="flex items-center">
                    {i > 0 ? (
                      <span
                        className="mx-1 hidden font-mono text-zinc-700 sm:mx-2 sm:inline"
                        aria-hidden
                      >
                        →
                      </span>
                    ) : null}
                    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-white/6 bg-crank-surface/35 px-2.5 py-2 sm:px-3">
                      <span className="shrink-0 rounded bg-crank-accent/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-crank-accent">
                        {node.abbr}
                      </span>
                      <span className="truncate font-mono text-[10px] text-zinc-500 sm:text-[11px]">
                        {node.detail}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative lg:pt-4">
            <div
              className="pointer-events-none absolute -right-6 top-1/4 hidden h-40 w-40 rounded-full border border-dashed border-crank-violet/20 lg:block"
              aria-hidden
            />
            <div className="relative opacity-0 animate-[fade-up_0.9s_cubic-bezier(0.16,1,0.3,1)_0.15s_both]">
              <TerminalPreview />
              <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-xl border border-white/6 bg-crank-surface/35 p-4 backdrop-blur-sm">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    Throughput
                  </span>
                  <div className="h-2 overflow-hidden rounded-full bg-crank-void">
                    <div className="h-full w-full origin-left scale-x-50 rounded-full bg-linear-to-r from-crank-accent to-teal-300 animate-pulse-bar" />
                  </div>
                  <span className="font-mono text-[10px] text-zinc-600">
                    worker pool scaling
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-xl border border-white/6 bg-crank-surface/35 p-4 backdrop-blur-sm">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    Queue depth
                  </span>
                  <div className="h-2 overflow-hidden rounded-full bg-crank-void">
                    <div className="h-full w-full origin-left scale-x-50 rounded-full bg-linear-to-r from-crank-violet to-violet-300 animate-pulse-bar [animation-delay:0.45s]" />
                  </div>
                  <span className="font-mono text-[10px] text-zinc-600">
                    bounded backlog
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
