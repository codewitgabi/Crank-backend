import { vi } from "vitest";
import { testClient } from "../../utils/test-client";

describe("POST /api/v1/auth/oauth/*", () => {
  it("logs in with valid google token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sub: "google-sub",
          email: "googleuser@example.com",
          email_verified: "true",
        }),
      }),
    );

    const response = await testClient().post("/api/v1/auth/oauth/google").send({
      idToken: "google-token",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeTruthy();
  });

  it("rejects invalid google token response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    const response = await testClient().post("/api/v1/auth/oauth/google").send({
      idToken: "bad-token",
    });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toContain("Invalid Google token");
  });

  it("fails validation for missing github access token", async () => {
    const response = await testClient().post("/api/v1/auth/oauth/github").send({});
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Validation failed");
  });
});
