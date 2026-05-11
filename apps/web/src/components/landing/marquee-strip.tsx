const items = [
  "Express 5",
  "MongoDB",
  "Mongoose",
  "Redis",
  "BullMQ",
  "JWT",
  "Vitest",
  "LOAD · STRESS · SPIKE · LATENCY",
  "TestRunSummary",
  "Project tenancy",
] as const;

function MarqueeContent({ track }: { track: "a" | "b" }) {
  return (
    <>
      {items.map((t) => (
        <span
          key={`${track}-${t}`}
          className="mx-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500"
        >
          <span
            className="size-1 rounded-full bg-crank-accent/60"
            aria-hidden
          />
          {t}
        </span>
      ))}
    </>
  );
}

export function MarqueeStrip() {
  return (
    <div className="relative border-y border-white/6 bg-crank-depth/80 py-3 overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-linear-to-r from-crank-depth to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-linear-to-l from-crank-depth to-transparent" />
      <div className="flex w-max animate-marquee">
        <div className="flex shrink-0 items-center">
          <MarqueeContent track="a" />
        </div>
        <div className="flex shrink-0 items-center" aria-hidden>
          <MarqueeContent track="b" />
        </div>
      </div>
    </div>
  );
}
