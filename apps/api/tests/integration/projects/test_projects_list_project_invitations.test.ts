import { StatusCodes } from "http-status-codes";
import { createAccessToken, createUser } from "../../utils/auth-fixtures";
import { extractInviteTokenFromLastEmail, projectsRoot } from "../../utils/project-fixtures";
import { testClient } from "../../utils/test-client";

describe("GET /api/v1/projects/:projectId/invitations", () => {
  it("allows owner/admin to list outbound pending invitations only", async () => {
    const owner = await createUser({
      email: "ilist-own@example.com",
      username: "ilownt",
    });
    const member = await createUser({
      email: "ilist-mem@example.com",
      username: "ilmem",
    });
    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Invite Board" });

    const id = created.body.data.id as string;

    await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: member.user.email });

    const ownerLists = await testClient()
      .get(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(ownerLists.status).toBe(StatusCodes.OK);
    expect(
      ownerLists.body.data.some(
        (inv: { email: string }) => inv.email === member.user.email,
      ),
    ).toBe(true);

    await testClient()
      .post(`${projectsRoot}/invitations/${extractInviteTokenFromLastEmail()}/accept`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(member.user._id.toString(), member.user.email)}`,
      );

    const memberLists = await testClient()
      .get(`${projectsRoot}/${id}/invitations`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(member.user._id.toString(), member.user.email)}`,
      );

    expect(memberLists.status).toBe(StatusCodes.FORBIDDEN);
  });
});
