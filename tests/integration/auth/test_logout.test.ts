import TokenBlacklist from "../../../src/models/tokenBlacklist.model";
import {
  createAccessToken,
  createRefreshToken,
  createUser,
} from "../../utils/auth-fixtures";
import { testClient } from "../../utils/test-client";

describe("POST /api/v1/auth/logout", () => {
  it("logs out and blacklists access token", async () => {
    const { user } = await createUser({
      email: "logout@example.com",
      username: "logoutuser",
    });
    const accessToken = createAccessToken(user._id.toString(), user.email);

    const response = await testClient()
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(200);
    const blacklisted = await TokenBlacklist.findOne({ token: accessToken });
    expect(blacklisted).toBeTruthy();
  });

  it("requires bearer token", async () => {
    const response = await testClient().post("/api/v1/auth/logout").send({});
    expect(response.status).toBe(401);
    expect(response.body.error.message).toContain("Missing bearer token");
  });

  it("blacklists refresh token when provided", async () => {
    const { user } = await createUser({
      email: "logout2@example.com",
      username: "logoutuser2",
    });
    const accessToken = createAccessToken(user._id.toString(), user.email);
    const refreshToken = createRefreshToken(user._id.toString(), user.email);

    const response = await testClient()
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ refreshToken });

    expect(response.status).toBe(200);
    const blacklistedRefresh = await TokenBlacklist.findOne({
      token: refreshToken,
    });
    expect(blacklistedRefresh).toBeTruthy();
  });
});
