import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { postAuthJson } from "../lib/auth-api";
import { saveAuthTokens } from "../lib/auth-session";
import {
  consumeGithubOAuthState,
  getGithubOAuthRedirectUri,
} from "../lib/github-oauth";

/** Strict Mode runs effects twice; state is single-use — dedupe by `code` so we only consume once. */
const githubOAuthExchangeByCode = new Map<string, Promise<void>>();

export function GithubOAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Completing GitHub sign-in…");

  const code = searchParams.get("code") ?? undefined;
  const state = searchParams.get("state") ?? undefined;
  const oauthError = searchParams.get("error") ?? undefined;
  const errorDescription = searchParams.get("error_description") ?? undefined;

  useEffect(() => {
    const run = async () => {
      if (oauthError) {
        setMessage(
          errorDescription || oauthError || "GitHub authorization was denied.",
        );
        return;
      }

      if (!code || !state) {
        setMessage("Missing authorization code. Start again from sign up.");
        return;
      }

      let task = githubOAuthExchangeByCode.get(code);
      if (!task) {
        task = (async () => {
          if (!consumeGithubOAuthState(state)) {
            setMessage(
              "Invalid or expired session. Please try GitHub sign-in again.",
            );
            return;
          }

          const redirectUri = getGithubOAuthRedirectUri();
          const res = await postAuthJson("/api/v1/auth/oauth/github/exchange", {
            code,
            redirectUri,
          });

          if (!res.ok) {
            setMessage(res.message);
            return;
          }

          const { accessToken, refreshToken } = res.body.data;
          if (accessToken && refreshToken) {
            saveAuthTokens(accessToken, refreshToken);
            setMessage("Success! Redirecting…");
            navigate("/");
            return;
          }

          setMessage("GitHub sign-in did not return tokens.");
        })();

        githubOAuthExchangeByCode.set(code, task);
        void task.finally(() => {
          githubOAuthExchangeByCode.delete(code);
        });
      }

      await task;
    };

    void run();
  }, [navigate, code, state, oauthError, errorDescription]);

  const failed =
    message !== "Completing GitHub sign-in…" &&
    message !== "Success! Redirecting…";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-crank-void px-4">
      <div className="max-w-md rounded-2xl border border-white/8 bg-crank-surface/40 p-8 text-center backdrop-blur-md">
        <p
          className={`text-sm ${failed ? "text-red-300" : "text-zinc-300"}`}
          role="status"
        >
          {message}
        </p>
        {failed ? (
          <Link
            to="/signup"
            className="mt-6 inline-block text-sm font-medium text-crank-accent hover:underline"
          >
            Back to sign up
          </Link>
        ) : null}
      </div>
    </div>
  );
}
