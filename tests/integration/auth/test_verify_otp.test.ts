import User from "../../../src/models/user.model";
import { OTPPurpose } from "../../../src/models/otp.model";
import { createOtp, createUser } from "../../utils/auth-fixtures";
import { testClient } from "../../utils/test-client";

describe("POST /api/v1/auth/verify-otp", () => {
  it("verifies valid otp and returns auth payload", async () => {
    const { user } = await createUser({
      email: "otpuser@example.com",
      username: "otpuser",
      isEmailVerified: false,
    });
    await createOtp({
      email: user.email,
      otp: "123456",
      purpose: OTPPurpose.EMAIL_VERIFICATION,
    });

    const response = await testClient().post("/api/v1/auth/verify-otp").send({
      email: user.email,
      otp: "123456",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeTruthy();
    expect(response.body.data.refreshToken).toBeTruthy();
    expect(response.body.data.user.isEmailVerified).toBe(true);
  });

  it("fails validation when otp length is invalid", async () => {
    const response = await testClient().post("/api/v1/auth/verify-otp").send({
      email: "otpuser@example.com",
      otp: "1234",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Validation failed");
  });

  it("rejects invalid otp", async () => {
    await createOtp({
      email: "wrongotp@example.com",
      otp: "123456",
      purpose: OTPPurpose.EMAIL_VERIFICATION,
    });

    const response = await testClient().post("/api/v1/auth/verify-otp").send({
      email: "wrongotp@example.com",
      otp: "654321",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Invalid or expired OTP");
  });
});
