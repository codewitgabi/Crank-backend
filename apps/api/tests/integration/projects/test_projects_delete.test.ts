import { StatusCodes } from "http-status-codes";
import ProjectInvitation, {
  InvitationStatus,
} from "../../../src/models/projectInvitation.model";
import { ProjectRole } from "../../../src/models/project.model";
import { createAccessToken, createUser } from "../../utils/auth-fixtures";
import { extractInviteTokenFromLastEmail, projectsRoot } from "../../utils/project-fixtures";
import { testClient } from "../../utils/test-client";

describe("DELETE /api/v1/projects/:projectId", () => {
  it("allows only the owner to delete", async () => {
    const owner = await createUser({
      email: "del-own@example.com",
      username: "delown",
    });
    const adminMember = await createUser({
      email: "del-adm@example.com",
      username: "deladm",
    });
    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Destroy Me" });
    const id = created.body.data.id as string;

    await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: adminMember.user.email, role: ProjectRole.ADMIN });

    const raw = extractInviteTokenFromLastEmail();
    await testClient()
      .post(`${projectsRoot}/invitations/${raw}/accept`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(adminMember.user._id.toString(), adminMember.user.email)}`,
      );

    const adminDenied = await testClient()
      .delete(`${projectsRoot}/${id}`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(adminMember.user._id.toString(), adminMember.user.email)}`,
      );
    expect(adminDenied.status).toBe(StatusCodes.FORBIDDEN);

    const ok = await testClient()
      .delete(`${projectsRoot}/${id}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(ok.status).toBe(StatusCodes.OK);
    expect(ok.body.message).toContain("deleted");
  });

  it("cancels pending invitations when deleting a project", async () => {
    const owner = await createUser({
      email: "cancel-inv-del@example.com",
      username: "candel",
    });
    const invitee = await createUser({
      email: "cancel-invitee@example.com",
      username: "caninvitee",
    });
    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Sweep Invites" });
    const id = created.body.data.id as string;

    await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: invitee.user.email });

    await testClient()
      .delete(`${projectsRoot}/${id}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    const pending = await ProjectInvitation.find({
      project: id,
      status: InvitationStatus.CANCELLED,
    });
    expect(pending.length).toBeGreaterThan(0);
  });
});
