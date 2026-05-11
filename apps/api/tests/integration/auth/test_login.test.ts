import { createUser } from "../../utils/auth-fixtures";
import { testClient } from "../../utils/test-client";

describe("POST /api/v1/auth/login", () => {
  it("logs in verified user", async () => {
    const { user, plainPassword } = await createUser({
      email: "login@example.com",
      username: "loginuser",
      isEmailVerified: true,
    });

    const response = await testClient().post("/api/v1/auth/login").send({
      email: user.email,
      password: plainPassword,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeTruthy();
    expect(response.body.data.refreshToken).toBeTruthy();
  });

  it("rejects unverified user", async () => {
    const { user, plainPassword } = await createUser({
      email: "notverified@example.com",
      username: "notverified",
      isEmailVerified: false,
    });

    const response = await testClient().post("/api/v1/auth/login").send({
      email: user.email,
      password: plainPassword,
    });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toContain("Email not verified");
  });

  it("rejects wrong credentials", async () => {
    const { user } = await createUser({
      email: "wrongpass@example.com",
      username: "wrongpass",
    });

    const response = await testClient().post("/api/v1/auth/login").send({
      email: user.email,
      password: "WrongPassword123!",
    });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe("Invalid email or password");
  });
});
