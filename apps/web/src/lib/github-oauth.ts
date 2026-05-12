const STATE_KEY = "crank_github_oauth_state";

export function getGithubOAuthRedirectUri() {
  return `${window.location.origin}/auth/github/callback`;
}

export function beginGithubOAuthSignIn(clientId: string) {
  const state = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, state);
  const redirectUri = getGithubOAuthRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user user:email",
    state,
  });
  window.location.assign(
    `https://github.com/login/oauth/authorize?${params.toString()}`,
  );
}

export function consumeGithubOAuthState(expected: string | null) {
  const saved = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  if (!saved || !expected || saved !== expected) {
    return false;
  }

  return true;
}
