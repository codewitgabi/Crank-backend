import User from "../../../src/models/user.model";
import { testClient } from "../../utils/test-client";

describe("POST /api/v1/auth/register", () => {
  it("registers successfully and requires verification", async () => {
    const response = await testClient().post("/api/v1/auth/register").send({
      username: "newuser",
      email: "newuser@example.com",
      password: "Password123!",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe("newuser@example.com");
    expect(response.body.data.requiresEmailVerification).toBe(true);
  });

  it("fails validation for weak password", async () => {
    const response = await testClient().post("/api/v1/auth/register").send({
      username: "newuser",
      email: "newuser@example.com",
      password: "weak",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Validation failed");
  });

  it("rejects duplicate verified account", async () => {
    await User.create({
      email: "dupe@example.com",
      username: "dupe",
      password: "hash",
      isEmailVerified: true,
      authProviders: {},
    });

    const response = await testClient().post("/api/v1/auth/register").send({
      username: "dupe2",
      email: "dupe@example.com",
      password: "Password123!",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("User already exists");
  });
});
