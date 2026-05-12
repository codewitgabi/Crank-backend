import { Link } from "react-router-dom";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/6 bg-crank-void/80 px-3 py-3 backdrop-blur-2xl sm:px-6 sm:py-3.5 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <Link
          to="/"
          className="group flex w-fit shrink-0 items-center gap-2 font-mono text-sm font-semibold tracking-tight text-white"
        >
          <span
            className="flex size-8 items-center justify-center rounded-lg border border-crank-border bg-linear-to-br from-crank-surface to-crank-void font-mono text-xs font-bold text-crank-accent transition group-hover:border-crank-accent/40 group-hover:shadow-[0_0_24px_-4px_var(--color-crank-accent)]"
            aria-hidden
          >
            {">"}
          </span>
          <span>
            crank<span className="text-crank-accent">.</span>
          </span>
        </Link>

        <nav
          className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-2 sm:justify-end sm:gap-x-2"
          aria-label="Main"
        >
          <a
            href="#how"
            className="inline-flex min-h-10 items-center rounded-lg px-2 text-xs text-zinc-400 transition hover:bg-white/4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crank-accent sm:min-h-0 sm:px-3 sm:text-sm"
          >
            Flow
          </a>
          <a
            href="#features"
            className="inline-flex min-h-10 items-center rounded-lg px-2 text-xs text-zinc-400 transition hover:bg-white/4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crank-accent sm:min-h-0 sm:px-3 sm:text-sm"
          >
            Capabilities
          </a>
          <Link
            to="/login"
            className="inline-flex min-h-10 items-center rounded-lg px-2 text-xs text-zinc-400 transition hover:bg-white/4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crank-accent sm:min-h-0 sm:px-3 sm:text-sm"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="inline-flex min-h-10 items-center rounded-lg border border-crank-border bg-crank-surface/50 px-2 text-xs text-zinc-200 transition hover:border-zinc-600 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crank-accent sm:min-h-0 sm:px-3 sm:text-sm"
          >
            Sign up
          </Link>
          <a
            href="https://github.com/codewitgabi/crank-backend"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-crank-border bg-crank-surface/50 px-2 text-xs text-zinc-300 transition hover:border-zinc-600 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crank-accent sm:min-h-0 sm:gap-2 sm:px-3 sm:text-sm"
          >
            <svg
              className="size-4 shrink-0 text-current"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.416-4.042-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.838 1.237 1.838 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            <span className="hidden min-[380px]:inline">GitHub</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
