import transporter from "../../../src/config/mail.config";
import { createUser } from "../../utils/auth-fixtures";
import { testClient } from "../../utils/test-client";

describe("POST /api/v1/auth/forgot-password", () => {
  it("sends password reset code for existing user", async () => {
    const { user } = await createUser({
      email: "forgot@example.com",
      username: "forgotuser",
    });

    const response = await testClient().post("/api/v1/auth/forgot-password").send({
      email: user.email,
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain("Password reset code sent");
    expect(transporter.sendMail).toHaveBeenCalledTimes(1);
  });

  it("fails validation for invalid email", async () => {
    const response = await testClient().post("/api/v1/auth/forgot-password").send({
      email: "bad-email",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Validation failed");
  });

  it("returns not found for unknown email", async () => {
    const response = await testClient().post("/api/v1/auth/forgot-password").send({
      email: "nouser@example.com",
    });

    expect(response.status).toBe(404);
    expect(response.body.error.message).toContain("No account found");
  });
});
