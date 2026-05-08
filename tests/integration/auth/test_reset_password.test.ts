import User from "../../../src/models/user.model";
import { OTPPurpose } from "../../../src/models/otp.model";
import { createOtp, createUser } from "../../utils/auth-fixtures";
import { testClient } from "../../utils/test-client";

describe("POST /api/v1/auth/reset-password", () => {
  it("resets password with verified otp", async () => {
    const { user } = await createUser({
      email: "reset@example.com",
      username: "resetuser",
      password: "Password123!",
    });
    await createOtp({
      email: user.email,
      otp: "12345",
      purpose: OTPPurpose.PASSWORD_RESET,
      verified: true,
    });

    const response = await testClient().post("/api/v1/auth/reset-password").send({
      email: user.email,
      password: "NewPassword123!",
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain("reset successfully");
  });

  it("fails validation for weak password", async () => {
    const response = await testClient().post("/api/v1/auth/reset-password").send({
      email: "reset@example.com",
      password: "weak",
    });
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Validation failed");
  });

  it("rejects when otp is not verified", async () => {
    await createUser({
      email: "reset2@example.com",
      username: "resetuser2",
      password: "Password123!",
    });

    const response = await testClient().post("/api/v1/auth/reset-password").send({
      email: "reset2@example.com",
      password: "NewPassword123!",
    });
    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain("Please verify your email first");
  });

  it("rejects same as current password", async () => {
    const { user, plainPassword } = await createUser({
      email: "reset3@example.com",
      username: "resetuser3",
      password: "Password123!",
    });
    await createOtp({
      email: user.email,
      otp: "12345",
      purpose: OTPPurpose.PASSWORD_RESET,
      verified: true,
    });

    const response = await testClient().post("/api/v1/auth/reset-password").send({
      email: user.email,
      password: plainPassword,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain("must be different");
  });
});
