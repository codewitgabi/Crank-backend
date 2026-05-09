import { StatusCodes } from "http-status-codes";
import { ProjectRole } from "../../../src/models/project.model";
import { createAccessToken, createUser } from "../../utils/auth-fixtures";
import { extractInviteTokenFromLastEmail, projectsRoot } from "../../utils/project-fixtures";
import { testClient } from "../../utils/test-client";

describe("GET /api/v1/projects/:projectId", () => {
  it("allows any member to read", async () => {
    const ownerBundle = await createUser({
      email: "rp-owner@example.com",
      username: "rpowner",
    });
    const memberBundle = await createUser({
      email: "rp-member@example.com",
      username: "rpmember",
    });
    const ownerToken = createAccessToken(
      ownerBundle.user._id.toString(),
      ownerBundle.user.email,
    );
    const memberToken = createAccessToken(
      memberBundle.user._id.toString(),
      memberBundle.user.email,
    );

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Readable Proj" });

    await testClient()
      .post(`${projectsRoot}/${created.body.data.id as string}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: memberBundle.user.email, role: ProjectRole.MEMBER });

    const inviteToken = extractInviteTokenFromLastEmail();
    await testClient()
      .post(`${projectsRoot}/invitations/${inviteToken}/accept`)
      .set("Authorization", `Bearer ${memberToken}`);

    const res = await testClient()
      .get(`${projectsRoot}/${created.body.data.id as string}`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.data.name).toBe("Readable Proj");
  });

  it("returns 403 for non-members", async () => {
    const owner = await createUser({
      email: "isol-owner@example.com",
      username: "isolowner",
    });
    const stranger = await createUser({
      email: "isol-out@example.com",
      username: "isolout",
    });

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(owner.user._id.toString(), owner.user.email)}`,
      )
      .send({ name: "Private Circle" });

    const res = await testClient()
      .get(`${projectsRoot}/${created.body.data.id as string}`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(stranger.user._id.toString(), stranger.user.email)}`,
      );

    expect(res.status).toBe(StatusCodes.FORBIDDEN);
    expect(res.body.error.message).toContain("do not have access");
  });

  it("returns 400 for malformed project ids", async () => {
    const { user } = await createUser({ email: "badid@example.com", username: "badid" });
    const token = createAccessToken(user._id.toString(), user.email);

    const res = await testClient()
      .get(`${projectsRoot}/not-a-mongo-id`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it("returns 404 for unknown ids", async () => {
    const { user } = await createUser({ email: "nf@example.com", username: "nfuser" });
    const token = createAccessToken(user._id.toString(), user.email);

    const res = await testClient()
      .get(`${projectsRoot}/507f1f77bcf86cd799439011`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(StatusCodes.NOT_FOUND);
  });

  it("returns 404 for soft-deleted projects", async () => {
    const { user } = await createUser({
      email: "del-read@example.com",
      username: "delread",
    });
    const token = createAccessToken(user._id.toString(), user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Deleted Read" });

    const id = created.body.data.id as string;
    await testClient().delete(`${projectsRoot}/${id}`).set("Authorization", `Bearer ${token}`);

    const res = await testClient()
      .get(`${projectsRoot}/${id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(StatusCodes.NOT_FOUND);
  });
});
