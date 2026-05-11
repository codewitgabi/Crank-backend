const lines = [
  {
    ts: "14:02:01",
    tone: "muted" as const,
    text: "bullmq:test-runs · worker-2 dequeue",
  },
  {
    ts: "14:02:01",
    tone: "accent" as const,
    text: "→ POST /v1/projects/acme/test-cases/orders/run",
  },
  {
    ts: "14:02:01",
    tone: "ok" as const,
    text: "← 202 Accepted · runId cr_8f2a… queued",
  },
  {
    ts: "14:02:03",
    tone: "muted" as const,
    text: "SPIKE profile · 400 RPS · 90s window",
  },
  {
    ts: "14:03:33",
    tone: "violet" as const,
    text: "p50 42ms · p95 118ms · 0 failed",
  },
];

const toneClass = {
  muted: "text-zinc-500",
  accent: "text-crank-accent",
  ok: "text-emerald-400/90",
  violet: "text-crank-violet",
};

export function TerminalPreview() {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -inset-1 rounded-2xl border border-crank-accent/12"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-60 blur-md"
        style={{
          background:
            "linear-gradient(120deg, var(--color-crank-accent), var(--color-crank-violet), var(--color-crank-rose))",
          backgroundSize: "200% 200%",
          animation: "border-flow 8s linear infinite",
        }}
      />

      <div className="relative overflow-hidden rounded-2xl border border-crank-border bg-crank-depth/95 shadow-[0_32px_64px_-32px_rgba(0,0,0,0.85)] backdrop-blur-md">
        {/* CRT-style scanlines (static for perf + compatibility) */}
        <div
          className="pointer-events-none absolute inset-0 z-10 opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.35) 1px, rgba(255,255,255,0.35) 2px)",
            backgroundSize: "100% 3px",
          }}
          aria-hidden
        />

        <div className="relative flex items-center justify-between gap-3 border-b border-crank-border bg-crank-surface/90 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-red-500/90 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <span className="size-2.5 rounded-full bg-amber-500/90" />
            <span className="size-2.5 rounded-full bg-emerald-500/90 shadow-[0_0_8px_rgba(34,197,94,0.35)]" />
            <span className="ml-2 hidden font-mono text-[11px] tracking-wide text-zinc-500 sm:inline">
              crank-worker@acme-prod — zsh
            </span>
            <span className="ml-2 font-mono text-[11px] tracking-wide text-zinc-500 sm:hidden">
              crank-worker
            </span>
          </div>
          <span className="rounded border border-white/8 bg-crank-void/80 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-zinc-500">
            LIVE
          </span>
        </div>

        <div className="relative p-4 font-mono text-[11px] leading-relaxed sm:p-5 sm:text-xs">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-linear-to-r from-transparent via-crank-accent/50 to-transparent"
            aria-hidden
          />
          <pre className="mb-4 overflow-x-auto rounded-xl border border-white/6 bg-crank-void/90 p-4 text-[10px] shadow-inner shadow-black/40 sm:text-[11px]">
            <code>
              <span className="select-none text-zinc-600">1 </span>
              <span className="text-crank-violet">{"{"}</span>
              {"\n"}
              <span className="select-none text-zinc-600">2 </span>
              {"  "}
              <span className="text-crank-accent">&quot;profile&quot;</span>
              <span className="text-zinc-500">: </span>
              <span className="text-amber-300/90">&quot;SPIKE&quot;</span>
              <span className="text-zinc-600">,</span>
              {"\n"}
              <span className="select-none text-zinc-600">3 </span>
              {"  "}
              <span className="text-crank-accent">&quot;target&quot;</span>
              <span className="text-zinc-500">: </span>
              <span className="text-emerald-400/85">
                &quot;https://api.example.com/v1/orders&quot;
              </span>
              <span className="text-zinc-600">,</span>
              {"\n"}
              <span className="select-none text-zinc-600">4 </span>
              {"  "}
              <span className="text-crank-accent">&quot;concurrency&quot;</span>
              <span className="text-zinc-500">: </span>
              <span className="text-orange-300/90">400</span>
              <span className="text-zinc-600">,</span>
              {"\n"}
              <span className="select-none text-zinc-600">5 </span>
              {"  "}
              <span className="text-crank-accent">&quot;durationSec&quot;</span>
              <span className="text-zinc-500">: </span>
              <span className="text-orange-300/90">90</span>
              {"\n"}
              <span className="select-none text-zinc-600">6 </span>
              <span className="text-crank-violet">{"}"}</span>
            </code>
          </pre>
          <div className="space-y-2.5 border-t border-white/6 pt-4">
            {lines.map((line, i) => (
              <p
                key={`${line.ts}-${line.text}`}
                className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 opacity-0 sm:flex-nowrap ${toneClass[line.tone]}`}
                style={{
                  animation: `fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${0.28 + i * 0.14}s forwards`,
                }}
              >
                <span className="shrink-0 font-mono text-[10px] text-zinc-600">
                  {line.ts}
                </span>
                <span className="min-w-0 break-all">{line.text}</span>
              </p>
            ))}
          </div>
          <span
            className="mt-4 inline-block h-3.5 w-2.5 rounded-sm bg-crank-accent shadow-[0_0_12px_var(--color-crank-accent)] animate-blink"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
