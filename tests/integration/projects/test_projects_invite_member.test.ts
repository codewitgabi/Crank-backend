import { StatusCodes } from "http-status-codes";
import { ProjectRole } from "../../../src/models/project.model";
import { createAccessToken, createUser } from "../../utils/auth-fixtures";
import { extractInviteTokenFromLastEmail, projectsRoot } from "../../utils/project-fixtures";
import { testClient } from "../../utils/test-client";

describe("POST /api/v1/projects/:projectId/invitations", () => {
  it("validates OWNER is not allowed as invite role", async () => {
    const owner = await createUser({
      email: "invite-role-own@example.com",
      username: "invrown",
    });
    const target = await createUser({
      email: "invite-role-tgt@example.com",
      username: "invrtgt",
    });
    const token = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Role Sanity" });

    const res = await testClient()
      .post(`${projectsRoot}/${created.body.data.id as string}/invitations`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: target.user.email, role: ProjectRole.OWNER });

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
    expect(res.body.error.message).toMatch(/validation failed/i);
    const details = res.body.error.details as Array<{ path?: string; msg?: string }>;
    const roleMsg = details.find((e) => String(e.path ?? "").includes("role"));
    expect(roleMsg?.msg ?? "").toMatch(/ADMIN.*MEMBER.*VIEWER|role/i);
  });

  it("rejects inviting someone who is already on the roster", async () => {
    const owner = await createUser({
      email: "invite-dup-own@example.com",
      username: "invdupown",
    });
    const member = await createUser({
      email: "invite-dup-mem@example.com",
      username: "invdupmem",
    });
    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Full House" });

    const id = created.body.data.id as string;

    await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: member.user.email });

    await testClient()
      .post(`${projectsRoot}/invitations/${extractInviteTokenFromLastEmail()}/accept`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(member.user._id.toString(), member.user.email)}`,
      );

    const dup = await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: member.user.email });

    expect(dup.status).toBe(StatusCodes.BAD_REQUEST);
    expect(dup.body.error.message).toContain("already");
  });

  it("rejects duplicate pending invitations for same email", async () => {
    const owner = await createUser({
      email: "pend-dup-own@example.com",
      username: "pdupown",
    });
    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Spam Guard" });

    const id = created.body.data.id as string;

    await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "pending-twice@example.com" });

    const second = await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "pending-twice@example.com" });

    expect(second.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it("allows only owner/admin to invite", async () => {
    const owner = await createUser({
      email: "inv-deny-own@example.com",
      username: "invdenyown",
    });
    const member = await createUser({
      email: "inv-deny-mem@example.com",
      username: "invdenymem",
    });
    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Locked Invites" });

    const id = created.body.data.id as string;

    await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: member.user.email });

    await testClient()
      .post(`${projectsRoot}/invitations/${extractInviteTokenFromLastEmail()}/accept`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(member.user._id.toString(), member.user.email)}`,
      );

    const denied = await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(member.user._id.toString(), member.user.email)}`,
      )
      .send({ email: "someone-else@example.com" });

    expect(denied.status).toBe(StatusCodes.FORBIDDEN);
  });
});
