import { GoogleLogin } from "@react-oauth/google";
import { Link, useNavigate } from "react-router-dom";
import { useCallback, useState, type FormEvent } from "react";
import { AuthShell } from "../components/auth/AuthShell";
import { PasswordField } from "../components/auth/password-field";
import { postAuthJson } from "../lib/auth-api";
import { saveAuthTokens } from "../lib/auth-session";
import { beginGithubOAuthSignIn } from "../lib/github-oauth";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
  const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID ?? "";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await postAuthJson("/api/v1/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      const { accessToken, refreshToken } = res.body.data;
      if (accessToken && refreshToken) {
        saveAuthTokens(accessToken, refreshToken);
        navigate("/");
        return;
      }
      setError("Login did not return tokens.");
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSuccess = useCallback(
    async (credential: string | undefined) => {
      if (!credential) {
        setError("Google did not return a credential.");
        return;
      }
      setError(null);
      setLoading(true);
      try {
        const res = await postAuthJson("/api/v1/auth/oauth/google", {
          idToken: credential,
        });
        if (!res.ok) {
          setError(res.message);
          return;
        }
        const { accessToken, refreshToken } = res.body.data;
        if (accessToken && refreshToken) {
          saveAuthTokens(accessToken, refreshToken);
          navigate("/");
          return;
        }
        setError("Google sign-in did not return tokens.");
      } finally {
        setLoading(false);
      }
    },
    [navigate],
  );

  const onGithubClick = () => {
    if (!githubClientId) {
      setError(
        "GitHub sign-in is not configured (missing VITE_GITHUB_CLIENT_ID).",
      );
      return;
    }
    setError(null);
    beginGithubOAuthSignIn(githubClientId);
  };

  return (
    <AuthShell
      variant="login"
      title="Welcome back"
      subtitle="Use the same email and password as your Crank account, or sign in with Google or GitHub."
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        {googleClientId ? (
          <div className="flex flex-1 justify-center [&>div]:w-full">
            <GoogleLogin
              theme="filled_black"
              size="large"
              width="100%"
              text="continue_with"
              onSuccess={(cred) => void onGoogleSuccess(cred.credential)}
              onError={() =>
                setError("Google sign-in was interrupted or failed.")
              }
            />
          </div>
        ) : (
          <p className="flex-1 rounded-xl border border-dashed border-zinc-700 py-3 text-center text-xs text-zinc-500">
            Set VITE_GOOGLE_CLIENT_ID to enable Google.
          </p>
        )}
        <button
          type="button"
          onClick={onGithubClick}
          disabled={!githubClientId || loading}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-crank-border bg-crank-void/80 px-4 py-3 text-sm font-medium text-white transition hover:border-zinc-500 hover:bg-crank-elevated/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg
            className="size-5 shrink-0"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.416-4.042-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.838 1.237 1.838 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
          GitHub
        </button>
      </div>

      <div className="my-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-white/8" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
          or email
        </span>
        <div className="h-px flex-1 bg-white/8" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="lg-email"
            className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-zinc-500"
          >
            Email
          </label>
          <input
            id="lg-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-crank-border bg-crank-void/80 px-4 py-3 text-sm text-white outline-none ring-crank-accent/40 transition placeholder:text-zinc-600 focus:border-crank-accent/50 focus:ring-2"
            placeholder="you@company.com"
          />
        </div>
        <PasswordField
          id="lg-password"
          name="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />

        {error ? (
          <p
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-linear-to-r from-crank-accent to-teal-400 py-3.5 text-sm font-medium text-crank-void transition hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "Please wait…" : "Log in"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-zinc-500">
        New here?{" "}
        <Link
          to="/signup"
          className="font-medium text-crank-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crank-accent"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
