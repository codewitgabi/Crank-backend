import { StatusCodes } from "http-status-codes";
import { InvitationStatus } from "../../../src/models/projectInvitation.model";
import { createAccessToken, createUser } from "../../utils/auth-fixtures";
import { extractInviteTokenFromLastEmail, projectsRoot } from "../../utils/project-fixtures";
import { testClient } from "../../utils/test-client";

describe("GET /api/v1/projects/invitations", () => {
  it("supports filtering invitations by lifecycle status", async () => {
    const owner = await createUser({
      email: "mine-own@example.com",
      username: "mineown",
    });
    const invitee = await createUser({
      email: "mine-in@example.com",
      username: "mineinv",
    });

    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "My Invitations" });

    await testClient()
      .post(`${projectsRoot}/${created.body.data.id as string}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: invitee.user.email });

    const inviteeTokenAuth = extractInviteTokenFromLastEmail();

    const inviteeJwt = createAccessToken(invitee.user._id.toString(), invitee.user.email);

    const pendingMine = await testClient()
      .get(`${projectsRoot}/invitations`)
      .query({ status: InvitationStatus.PENDING })
      .set("Authorization", `Bearer ${inviteeJwt}`);

    expect(pendingMine.status).toBe(StatusCodes.OK);
    expect(Array.isArray(pendingMine.body.data)).toBe(true);

    await testClient()
      .post(`${projectsRoot}/invitations/${inviteeTokenAuth}/accept`)
      .set("Authorization", `Bearer ${inviteeJwt}`);

    const acceptedMine = await testClient()
      .get(`${projectsRoot}/invitations`)
      .query({ status: InvitationStatus.ACCEPTED })
      .set("Authorization", `Bearer ${inviteeJwt}`);

    expect(acceptedMine.status).toBe(StatusCodes.OK);
    expect(
      acceptedMine.body.data.some(
        (row: { status: InvitationStatus }) => row.status === InvitationStatus.ACCEPTED,
      ),
    ).toBe(true);

    const badFilter = await testClient()
      .get(`${projectsRoot}/invitations`)
      .query({ status: "WRONG_STATUS" })
      .set("Authorization", `Bearer ${inviteeJwt}`);

    expect(badFilter.status).toBe(StatusCodes.BAD_REQUEST);
  });
});
