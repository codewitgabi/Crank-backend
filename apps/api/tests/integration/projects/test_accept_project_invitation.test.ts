import { StatusCodes } from "http-status-codes";
import ProjectInvitation, {
  InvitationStatus,
} from "../../../src/models/projectInvitation.model";
import { ProjectRole } from "../../../src/models/project.model";
import { createAccessToken, createUser } from "../../utils/auth-fixtures";
import { extractInviteTokenFromLastEmail, projectsRoot } from "../../utils/project-fixtures";
import { testClient } from "../../utils/test-client";

describe("POST /api/v1/projects/invitations/:token/accept", () => {
  it("accepts when token matches logged-in user's email", async () => {
    const owner = await createUser({
      email: "acc-own@example.com",
      username: "accown",
    });
    const invitee = await createUser({
      email: "acc-real@example.com",
      username: "accreal",
    });
    const wrong = await createUser({
      email: "acc-wrong@example.com",
      username: "accwrong",
    });

    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Join Us" });

    const id = created.body.data.id as string;

    await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: invitee.user.email, role: ProjectRole.MEMBER });

    const rawToken = extractInviteTokenFromLastEmail();

    const wrongTry = await testClient()
      .post(`${projectsRoot}/invitations/${rawToken}/accept`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(wrong.user._id.toString(), wrong.user.email)}`,
      );
    expect(wrongTry.status).toBe(StatusCodes.FORBIDDEN);

    await testClient()
      .post(`${projectsRoot}/invitations/${rawToken}/accept`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(invitee.user._id.toString(), invitee.user.email)}`,
      );

    const refreshed = await testClient()
      .get(`${projectsRoot}/${id}`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(invitee.user._id.toString(), invitee.user.email)}`,
      );
    expect(refreshed.status).toBe(StatusCodes.OK);

    const reinvite = await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: invitee.user.email });

    expect(reinvite.status).toBe(StatusCodes.BAD_REQUEST);
    expect(reinvite.body.error.message).toMatch(/already a project member/i);
  });

  it("handles expired invitations", async () => {
    const owner = await createUser({
      email: "exp-own@example.com",
      username: "expown",
    });
    const invitee = await createUser({
      email: "exp-mem@example.com",
      username: "expmem",
    });
    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Past Due" });

    const id = created.body.data.id as string;

    await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: invitee.user.email });

    const token = extractInviteTokenFromLastEmail();
    const invitation = await ProjectInvitation.findOne({
      email: invitee.user.email,
      project: id,
    });
    expect(invitation).toBeTruthy();
    await ProjectInvitation.updateOne(
      { _id: invitation!._id },
      { $set: { expiresAt: new Date(Date.now() - 60_000) } },
    );

    const res = await testClient()
      .post(`${projectsRoot}/invitations/${token}/accept`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(invitee.user._id.toString(), invitee.user.email)}`,
      );

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
    expect(res.body.error.message.toLowerCase()).toContain("expired");
  });

  it("rejects revoked, replayed, or cancelling ACCEPTED invitations", async () => {
    const owner = await createUser({
      email: "stat-own@example.com",
      username: "statown",
    });
    const invitee = await createUser({
      email: "stat-mem@example.com",
      username: "statmem",
    });

    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "State Machine" });

    const id = created.body.data.id as string;

    await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: invitee.user.email });

    const inviteToken = extractInviteTokenFromLastEmail();

    const cancelId = (
      await ProjectInvitation.findOne({ email: invitee.user.email, project: id })
    )?._id;
    await testClient()
      .delete(`${projectsRoot}/${id}/invitations/${cancelId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    const revoked = await testClient()
      .post(`${projectsRoot}/invitations/${inviteToken}/accept`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(invitee.user._id.toString(), invitee.user.email)}`,
      );
    expect(revoked.status).toBe(StatusCodes.BAD_REQUEST);
    expect(revoked.body.error.message).toMatch(/revoked/i);

    await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: invitee.user.email });

    const freshToken = extractInviteTokenFromLastEmail();
    await testClient()
      .post(`${projectsRoot}/invitations/${freshToken}/accept`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(invitee.user._id.toString(), invitee.user.email)}`,
      );

    const replay = await testClient()
      .post(`${projectsRoot}/invitations/${freshToken}/accept`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(invitee.user._id.toString(), invitee.user.email)}`,
      );
    expect(replay.status).toBe(StatusCodes.BAD_REQUEST);
    expect(replay.body.error.message.toLowerCase()).toContain("already");

    const acceptedRow = await ProjectInvitation.findOne({
      project: id,
      email: invitee.user.email,
      status: InvitationStatus.ACCEPTED,
    });
    expect(acceptedRow).toBeTruthy();

    const cancelAccepted = await testClient()
      .delete(`${projectsRoot}/${id}/invitations/${acceptedRow!._id}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(cancelAccepted.status).toBe(StatusCodes.BAD_REQUEST);
    expect(cancelAccepted.body.error.message.toLowerCase()).toContain("accepted");
  });

  it("validates minimum token length", async () => {
    const { user } = await createUser({
      email: "tok-val@example.com",
      username: "tokval",
    });
    const token = createAccessToken(user._id.toString(), user.email);

    const res = await testClient()
      .post(`${projectsRoot}/invitations/short/accept`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it("returns 404 when token hash is unknown", async () => {
    const { user } = await createUser({
      email: "tok-404@example.com",
      username: "tok404",
    });

    const res = await testClient()
      .post(`${projectsRoot}/invitations/${"abcd".repeat(10)}/accept`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(user._id.toString(), user.email)}`,
      );

    expect(res.status).toBe(StatusCodes.NOT_FOUND);
  });
});
