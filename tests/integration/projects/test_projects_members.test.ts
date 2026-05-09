import { StatusCodes } from "http-status-codes";
import { ProjectRole } from "../../../src/models/project.model";
import { createAccessToken, createUser } from "../../utils/auth-fixtures";
import { extractInviteTokenFromLastEmail, projectsRoot } from "../../utils/project-fixtures";
import { testClient } from "../../utils/test-client";

describe("GET /api/v1/projects/:projectId/members", () => {
  it("allows any member to list members", async () => {
    const owner = await createUser({
      email: "mem-list-own@example.com",
      username: "memlsown",
    });
    const member = await createUser({
      email: "mem-list-mem@example.com",
      username: "memlsmem",
    });

    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);
    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Crowd" });

    await testClient()
      .post(`${projectsRoot}/${created.body.data.id as string}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: member.user.email });

    await testClient()
      .post(`${projectsRoot}/invitations/${extractInviteTokenFromLastEmail()}/accept`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(member.user._id.toString(), member.user.email)}`,
      );

    const res = await testClient()
      .get(`${projectsRoot}/${created.body.data.id as string}/members`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(member.user._id.toString(), member.user.email)}`,
      );

    expect(res.status).toBe(StatusCodes.OK);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it("returns 403 when listing members outside the project", async () => {
    const owner = await createUser({
      email: "mem-out-own@example.com",
      username: "moutown",
    });
    const outsider = await createUser({
      email: "mem-out-str@example.com",
      username: "moutstr",
    });
    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Closed Doors" });

    const res = await testClient()
      .get(`${projectsRoot}/${created.body.data.id as string}/members`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(outsider.user._id.toString(), outsider.user.email)}`,
      );

    expect(res.status).toBe(StatusCodes.FORBIDDEN);
  });
});

describe("DELETE /api/v1/projects/:projectId/members/:memberId", () => {
  it("ADMIN can remove members but not the OWNER", async () => {
    const owner = await createUser({
      email: "rem-own@example.com",
      username: "remown",
    });
    const admin = await createUser({
      email: "rem-adm@example.com",
      username: "remadm",
    });
    const member = await createUser({
      email: "rem-mem@example.com",
      username: "remmem",
    });
    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Prune Members" });

    const id = created.body.data.id as string;

    await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: admin.user.email, role: ProjectRole.ADMIN });

    await testClient()
      .post(`${projectsRoot}/invitations/${extractInviteTokenFromLastEmail()}/accept`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(admin.user._id.toString(), admin.user.email)}`,
      );

    await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(admin.user._id.toString(), admin.user.email)}`,
      )
      .send({ email: member.user.email });

    await testClient()
      .post(`${projectsRoot}/invitations/${extractInviteTokenFromLastEmail()}/accept`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(member.user._id.toString(), member.user.email)}`,
      );

    const adminToken = createAccessToken(admin.user._id.toString(), admin.user.email);

    const blockOwnerRemoval = await testClient()
      .delete(`${projectsRoot}/${id}/members/${owner.user._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(blockOwnerRemoval.status).toBe(StatusCodes.BAD_REQUEST);
    expect(blockOwnerRemoval.body.error.message).toContain("owner");

    const removeMemberReq = await testClient()
      .delete(`${projectsRoot}/${id}/members/${member.user._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(removeMemberReq.status).toBe(StatusCodes.OK);

    const secondRemove = await testClient()
      .delete(`${projectsRoot}/${id}/members/${member.user._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(secondRemove.status).toBe(StatusCodes.NOT_FOUND);
  });

  it("MEMBER cannot remove others", async () => {
    const owner = await createUser({
      email: "rem-deny-own@example.com",
      username: "rdnown",
    });
    const a = await createUser({
      email: "rem-deny-a@example.com",
      username: "rdna",
    });
    const b = await createUser({
      email: "rem-deny-b@example.com",
      username: "rdnb",
    });
    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Flat Hierarchy" });

    const id = created.body.data.id as string;

    await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: a.user.email });

    await testClient()
      .post(`${projectsRoot}/invitations/${extractInviteTokenFromLastEmail()}/accept`)
      .set("Authorization", `Bearer ${createAccessToken(a.user._id.toString(), a.user.email)}`);

    await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: b.user.email });

    await testClient()
      .post(`${projectsRoot}/invitations/${extractInviteTokenFromLastEmail()}/accept`)
      .set("Authorization", `Bearer ${createAccessToken(b.user._id.toString(), b.user.email)}`);

    const denied = await testClient()
      .delete(`${projectsRoot}/${id}/members/${b.user._id}`)
      .set("Authorization", `Bearer ${createAccessToken(a.user._id.toString(), a.user.email)}`);
    expect(denied.status).toBe(StatusCodes.FORBIDDEN);
  });
});

describe("POST /api/v1/projects/:projectId/leave", () => {
  it("allows a regular member to leave but blocks the OWNER", async () => {
    const owner = await createUser({
      email: "leave-own@example.com",
      username: "lvown",
    });
    const member = await createUser({
      email: "leave-mem@example.com",
      username: "lvmem",
    });
    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Departures" });

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

    const ownerLeave = await testClient()
      .post(`${projectsRoot}/${id}/leave`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(ownerLeave.status).toBe(StatusCodes.BAD_REQUEST);

    const memberLeave = await testClient()
      .post(`${projectsRoot}/${id}/leave`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(member.user._id.toString(), member.user.email)}`,
      );
    expect(memberLeave.status).toBe(StatusCodes.OK);

    const listAfter = await testClient()
      .get(`${projectsRoot}/`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(member.user._id.toString(), member.user.email)}`,
      );

    expect(
      listAfter.body.data.some((p: { slug: string }) => p.slug === "departures"),
    ).toBe(false);
  });

  it("returns 404 when leaving a project without membership", async () => {
    const owner = await createUser({
      email: "leave-nf-own@example.com",
      username: "lvnfown",
    });
    const nobody = await createUser({
      email: "leave-nf-x@example.com",
      username: "lvnfx",
    });
    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Solo Room" });

    const res = await testClient()
      .post(`${projectsRoot}/${created.body.data.id as string}/leave`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(nobody.user._id.toString(), nobody.user.email)}`,
      );

    expect(res.status).toBe(StatusCodes.NOT_FOUND);
  });
});
