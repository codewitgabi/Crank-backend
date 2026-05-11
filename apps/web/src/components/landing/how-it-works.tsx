const steps = [
  {
    step: "01",
    title: "Define",
    body: "Auth’d requests create test cases under a project—targets, profiles, and concurrency live in Mongo.",
  },
  {
    step: "02",
    title: "Trigger",
    body: "POST /run returns fast: either the worker queue picks it up, or inline execution kicks off without blocking your client.",
  },
  {
    step: "03",
    title: "Observe",
    body: "Summaries land in TestRunSummary—latency bands, throughput, failures—so regressions show up in data.",
  },
] as const;

export function HowItWorks() {
  return (
    <section
      id="how"
      className="scroll-mt-24 border-t border-white/6 px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-crank-violet">
              Execution model
            </p>
            <h2 className="mt-2 max-w-xl text-3xl font-medium tracking-tight text-white sm:text-4xl">
              From JSON payload to histograms—without babysitting threads.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-zinc-500 lg:text-right">
            Crank mirrors how real teams ship: bounded contexts per project,
            async workers for spikes, and persisted runs you can diff in CI or
            the dashboard.
          </p>
        </div>

        <ol className="mt-16 grid gap-6 lg:grid-cols-3">
          {steps.map((s, i) => (
            <li
              key={s.step}
              className="group relative"
              style={{
                animation: `fade-up 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 * i}s both`,
              }}
            >
              <div className="relative z-10 flex h-full flex-col rounded-2xl border border-crank-border bg-crank-surface/30 p-6 transition duration-300 hover:border-crank-accent/25 hover:bg-crank-elevated/40 hover:shadow-[0_0_0_1px_rgba(45,212,191,0.08),0_24px_48px_-24px_rgba(0,0,0,0.6)]">
                <span className="font-mono text-[10px] font-medium text-crank-accent">
                  {s.step}
                </span>
                <h3 className="mt-3 text-lg font-medium text-white">
                  {s.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">
                  {s.body}
                </p>
                <div className="mt-6 flex flex-wrap gap-2 border-t border-white/6 pt-4 font-mono text-[10px] text-zinc-600">
                  {i === 0 ? (
                    <>
                      <span className="rounded border border-crank-border px-1.5 py-0.5">
                        /test-cases
                      </span>
                      <span className="rounded border border-crank-border px-1.5 py-0.5">
                        Mongoose
                      </span>
                    </>
                  ) : null}
                  {i === 1 ? (
                    <>
                      <span className="rounded border border-crank-border px-1.5 py-0.5">
                        202 Accepted
                      </span>
                      <span className="rounded border border-crank-border px-1.5 py-0.5">
                        test-runs queue
                      </span>
                    </>
                  ) : null}
                  {i === 2 ? (
                    <>
                      <span className="rounded border border-crank-border px-1.5 py-0.5">
                        p50 / p95
                      </span>
                      <span className="rounded border border-crank-border px-1.5 py-0.5">
                        aggregates
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
