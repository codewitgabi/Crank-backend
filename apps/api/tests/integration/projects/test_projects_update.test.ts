import { StatusCodes } from "http-status-codes";
import { ProjectRole, ProjectVisibility } from "../../../src/models/project.model";
import { createAccessToken, createUser } from "../../utils/auth-fixtures";
import { extractInviteTokenFromLastEmail, projectsRoot } from "../../utils/project-fixtures";
import { testClient } from "../../utils/test-client";

describe("PATCH /api/v1/projects/:projectId", () => {
  it("allows owner and ADMIN to update", async () => {
    const owner = await createUser({
      email: "patch-own@example.com",
      username: "patchown",
    });
    const adminMember = await createUser({
      email: "patch-adm@example.com",
      username: "patchadm",
    });
    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Patchable" });
    const id = created.body.data.id as string;

    await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: adminMember.user.email, role: ProjectRole.ADMIN });

    const adminTokenRaw = extractInviteTokenFromLastEmail();
    await testClient()
      .post(`${projectsRoot}/invitations/${adminTokenRaw}/accept`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(adminMember.user._id.toString(), adminMember.user.email)}`,
      );

    const adminToken = createAccessToken(adminMember.user._id.toString(), adminMember.user.email);

    const fromAdmin = await testClient()
      .patch(`${projectsRoot}/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ description: "by admin", visibility: ProjectVisibility.PRIVATE });

    expect(fromAdmin.status).toBe(StatusCodes.OK);
    expect(fromAdmin.body.data.description).toBe("by admin");
  });

  it("blocks MEMBER and VIEWER from updating", async () => {
    const owner = await createUser({
      email: "block-own@example.com",
      username: "blockown",
    });
    const member = await createUser({
      email: "block-mem@example.com",
      username: "blockmem",
    });
    const viewer = await createUser({
      email: "block-view@example.com",
      username: "blockview",
    });
    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Rigid Project" });
    const id = created.body.data.id as string;

    await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: member.user.email });

    const memberInviteToken = extractInviteTokenFromLastEmail();

    await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: viewer.user.email, role: ProjectRole.VIEWER });

    const viewerInviteToken = extractInviteTokenFromLastEmail();

    await testClient()
      .post(`${projectsRoot}/invitations/${memberInviteToken}/accept`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(member.user._id.toString(), member.user.email)}`,
      );

    await testClient()
      .post(`${projectsRoot}/invitations/${viewerInviteToken}/accept`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(viewer.user._id.toString(), viewer.user.email)}`,
      );

    const memberToken = createAccessToken(member.user._id.toString(), member.user.email);
    const viewerToken = createAccessToken(viewer.user._id.toString(), viewer.user.email);

    const memRes = await testClient()
      .patch(`${projectsRoot}/${id}`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ description: "nope" });
    expect(memRes.status).toBe(StatusCodes.FORBIDDEN);

    const viewRes = await testClient()
      .patch(`${projectsRoot}/${id}`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ description: "nope2" });
    expect(viewRes.status).toBe(StatusCodes.FORBIDDEN);
  });
});
