import User from "../../../src/models/user.model";
import { createAccessToken, createUser } from "../../utils/auth-fixtures";
import { testClient } from "../../utils/test-client";

describe("GET /api/v1/auth/me", () => {
  it("returns authenticated user profile", async () => {
    const { user } = await createUser({
      email: "me@example.com",
      username: "meuser",
    });
    const accessToken = createAccessToken(user._id.toString(), user.email);

    const response = await testClient()
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe("me@example.com");
  });

  it("requires auth token", async () => {
    const response = await testClient().get("/api/v1/auth/me");
    expect(response.status).toBe(401);
    expect(response.body.error.message).toContain("Missing bearer token");
  });

  it("rejects when token user does not exist", async () => {
    const { user } = await createUser({
      email: "ghost@example.com",
      username: "ghostuser",
    });
    const accessToken = createAccessToken(user._id.toString(), user.email);
    await User.deleteOne({ _id: user._id });

    const response = await testClient()
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(401);
    expect(response.body.error.message).toContain("User no longer exists");
  });
});
