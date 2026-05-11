import { createAccessToken, createUser } from "../../utils/auth-fixtures";
import { testClient } from "../../utils/test-client";

describe("POST /api/v1/auth/change-password", () => {
  it("changes password for authenticated user", async () => {
    const { user, plainPassword } = await createUser({
      email: "changepass@example.com",
      username: "changepass",
      password: "Password123!",
    });
    const accessToken = createAccessToken(user._id.toString(), user.email);

    const response = await testClient()
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currentPassword: plainPassword,
        newPassword: "NewPassword123!",
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain("changed successfully");
  });

  it("requires auth token", async () => {
    const response = await testClient()
      .post("/api/v1/auth/change-password")
      .send({
        currentPassword: "Password123!",
        newPassword: "NewPassword123!",
      });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toContain("Missing bearer token");
  });

  it("rejects wrong current password", async () => {
    const { user } = await createUser({
      email: "wrongcurrent@example.com",
      username: "wrongcurrent",
      password: "Password123!",
    });
    const accessToken = createAccessToken(user._id.toString(), user.email);

    const response = await testClient()
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currentPassword: "WrongPassword123!",
        newPassword: "NewPassword123!",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain(
      "Current password is incorrect",
    );
  });
});
