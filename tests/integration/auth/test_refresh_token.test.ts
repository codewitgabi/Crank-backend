import TokenBlacklist from "../../../src/models/tokenBlacklist.model";
import { createRefreshToken, createUser } from "../../utils/auth-fixtures";
import { testClient } from "../../utils/test-client";

describe("POST /api/v1/auth/refresh-token", () => {
  it("refreshes token with valid refresh token", async () => {
    const { user } = await createUser({
      email: "refresh@example.com",
      username: "refreshuser",
    });
    const refreshToken = createRefreshToken(user._id.toString(), user.email);

    const response = await testClient()
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeTruthy();
    expect(response.body.data.refreshToken).toBeTruthy();
  });

  it("fails validation when token is missing", async () => {
    const response = await testClient().post("/api/v1/auth/refresh-token").send({});

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Validation failed");
  });

  it("rejects blacklisted refresh token", async () => {
    const { user } = await createUser({
      email: "blacklisted@example.com",
      username: "blacklisted",
    });
    const refreshToken = createRefreshToken(user._id.toString(), user.email);
    await TokenBlacklist.create({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const response = await testClient()
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe("Token has been revoked");
  });
});
