import { StatusCodes } from "http-status-codes";
import { createAccessToken, createUser } from "../../utils/auth-fixtures";
import { projectsRoot } from "../../utils/project-fixtures";
import { testClient } from "../../utils/test-client";

describe("GET /api/v1/projects", () => {
  it("requires a bearer token", async () => {
    const res = await testClient().get(`${projectsRoot}/`);

    expect(res.status).toBe(StatusCodes.UNAUTHORIZED);
    expect(res.body.error.message).toContain("Missing bearer token");
  });

  it("rejects a non-JWT bearer value", async () => {
    const res = await testClient()
      .get(`${projectsRoot}/`)
      .set("Authorization", "Bearer not-a-real-jwt");

    expect(res.status).toBe(StatusCodes.UNAUTHORIZED);
    expect(res.body.error.message.toLowerCase()).toMatch(/invalid|expired|unauthorized/);
  });

  it("returns memberships for the authenticated user sorted by updatedAt descending", async () => {
    const { user } = await createUser({
      email: "lister@example.com",
      username: "lister",
    });
    const other = await createUser({
      email: "foreign@example.com",
      username: "foreign",
    });
    const token = createAccessToken(user._id.toString(), user.email);
    const otherToken = createAccessToken(other.user._id.toString(), other.user.email);

    const first = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "First Project Xyz" });

    await testClient()
      .patch(`${projectsRoot}/${first.body.data.id as string}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "touch" });

    await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Second Project Abc" });

    await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ name: "Secret Other" });

    const res = await testClient()
      .get(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(StatusCodes.OK);
    const items = res.body.data as Array<{ slug: string }>;
    expect(items).toHaveLength(2);
    expect(items[0].slug).toBe("second-project-abc");
    expect(items.map((p) => p.slug).includes("secret-other")).toBe(false);
  });
});
