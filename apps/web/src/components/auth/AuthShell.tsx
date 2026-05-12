import { Link } from "react-router-dom";
import type { ReactNode } from "react";

type AuthShellProps = {
  variant?: "signup" | "login" | "verify";
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AuthShell({
  variant = "signup",
  title,
  subtitle,
  children,
}: AuthShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-crank-void">
      <header className="border-b border-white/6 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            to="/"
            className="font-mono text-sm font-semibold tracking-tight text-white"
          >
            crank<span className="text-crank-accent">.</span>
          </Link>
          {variant === "login" ? (
            <Link
              to="/signup"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Sign up
            </Link>
          ) : variant === "verify" ? (
            <Link
              to="/signup"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Back
            </Link>
          ) : (
            <Link
              to="/login"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Log in
            </Link>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-[440px] rounded-2xl border border-white/8 bg-crank-surface/40 p-8 shadow-[0_32px_64px_-32px_rgba(0,0,0,0.75)] backdrop-blur-md sm:p-10">
          <h1 className="text-2xl font-medium tracking-tight text-white">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              {subtitle}
            </p>
          ) : null}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
