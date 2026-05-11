import transporter from "../../../src/config/mail.config";
import User from "../../../src/models/user.model";
import { testClient } from "../../utils/test-client";

describe("POST /api/v1/auth/send-verification", () => {
  it("sends verification code for a fresh email", async () => {
    const response = await testClient().post("/api/v1/auth/send-verification").send({
      email: "fresh@example.com",
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain("Verification code sent");
    expect(transporter.sendMail).toHaveBeenCalledTimes(1);
  });

  it("fails validation for invalid email", async () => {
    const response = await testClient().post("/api/v1/auth/send-verification").send({
      email: "bad-email",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Validation failed");
  });

  it("rejects already registered verified email", async () => {
    await User.create({
      email: "verified@example.com",
      username: "verifiedUser",
      password: "hash",
      isEmailVerified: true,
      authProviders: {},
    });

    const response = await testClient().post("/api/v1/auth/send-verification").send({
      email: "verified@example.com",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Email already registered");
  });
});
