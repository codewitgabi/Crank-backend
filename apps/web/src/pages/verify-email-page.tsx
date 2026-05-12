import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, type FormEvent } from "react";
import { AuthShell } from "../components/auth/AuthShell";
import { postAuthJson } from "../lib/auth-api";
import { saveAuthTokens } from "../lib/auth-session";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(
    () => searchParams.get("email") ?? "",
  );
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onResend = async () => {
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await postAuthJson("/api/v1/auth/send-verification", {
        email: email.trim().toLowerCase(),
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setInfo("Check your inbox for a new 6-digit code.");
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || otp.length !== 6) {
      setError("Enter your email and a 6-digit code.");
      return;
    }
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await postAuthJson("/api/v1/auth/verify-otp", {
        email: email.trim().toLowerCase(),
        otp,
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
      setError(
        "Verification completed but no session was issued. Try logging in with your password.",
      );
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      variant="verify"
      title="Verify your email"
      subtitle="We sent a 6-digit code to your inbox. Enter it below to activate your account and receive your session tokens."
    >
      <form onSubmit={onVerify} className="space-y-4">
        <div>
          <label
            htmlFor="ve-email"
            className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-zinc-500"
          >
            Email
          </label>
          <input
            id="ve-email"
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
        <div>
          <label
            htmlFor="ve-otp"
            className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-zinc-500"
          >
            6-digit code
          </label>
          <input
            id="ve-otp"
            name="otp"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            required
            className="w-full rounded-xl border border-crank-border bg-crank-void/80 px-4 py-3 font-mono text-lg tracking-[0.4em] text-white outline-none ring-crank-accent/40 transition placeholder:text-zinc-600 focus:border-crank-accent/50 focus:ring-2"
            placeholder="000000"
          />
        </div>

        {error ? (
          <p
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="rounded-lg border border-crank-accent/25 bg-crank-accent/10 px-3 py-2 text-sm text-crank-accent">
            {info}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-linear-to-r from-crank-accent to-teal-400 py-3.5 text-sm font-medium text-crank-void transition hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "Please wait…" : "Verify & continue"}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => void onResend()}
          disabled={loading}
          className="text-sm font-medium text-zinc-400 underline-offset-4 transition hover:text-white hover:underline disabled:opacity-50"
        >
          Resend code
        </button>
        <Link
          to="/signup"
          className="text-sm text-zinc-500 transition hover:text-zinc-300"
        >
          Wrong email? Start over
        </Link>
      </div>
    </AuthShell>
  );
}
