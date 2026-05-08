import { OTPPurpose } from "../../../src/models/otp.model";
import { createOtp } from "../../utils/auth-fixtures";
import { testClient } from "../../utils/test-client";

describe("POST /api/v1/auth/verify-password-reset-otp", () => {
  it("verifies a valid password reset otp", async () => {
    await createOtp({
      email: "resetotp@example.com",
      otp: "12345",
      purpose: OTPPurpose.PASSWORD_RESET,
    });

    const response = await testClient()
      .post("/api/v1/auth/verify-password-reset-otp")
      .send({
        email: "resetotp@example.com",
        otp: "12345",
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain("verified successfully");
  });

  it("fails validation for non numeric otp", async () => {
    const response = await testClient()
      .post("/api/v1/auth/verify-password-reset-otp")
      .send({
        email: "resetotp@example.com",
        otp: "abcde",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Validation failed");
  });

  it("rejects invalid otp", async () => {
    await createOtp({
      email: "resetotp2@example.com",
      otp: "11111",
      purpose: OTPPurpose.PASSWORD_RESET,
    });

    const response = await testClient()
      .post("/api/v1/auth/verify-password-reset-otp")
      .send({
        email: "resetotp2@example.com",
        otp: "22222",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain("Invalid or expired");
  });
});
