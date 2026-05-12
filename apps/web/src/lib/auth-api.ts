export const getApiBaseUrl = () =>
  (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7000").replace(
    /\/$/,
    "",
  );

type ApiErrorBody = {
  error?: { message?: string; details?: unknown };
  message?: string;
};

export type AuthSuccessData = {
  user?: unknown;
  accessToken?: string;
  refreshToken?: string;
  requiresEmailVerification?: boolean;
};

export async function postAuthJson(
  path: string,
  body: Record<string, unknown>,
): Promise<
  | {
      ok: true;
      status: number;
      body: { message: string; data: AuthSuccessData };
    }
  | { ok: false; status: number; message: string }
> {
  const url = `${getApiBaseUrl()}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as
    | { message?: string; data?: AuthSuccessData; status?: string }
    | ApiErrorBody;

  if (!res.ok) {
    const err = json as ApiErrorBody;
    const message = err.error?.message ?? err.message ?? "Something went wrong";
    return { ok: false, status: res.status, message };
  }

  const success = json as {
    message: string;
    data: AuthSuccessData;
  };
  return {
    ok: true,
    status: res.status,
    body: {
      message: success.message ?? "OK",
      data: success.data ?? {},
    },
  };
}
