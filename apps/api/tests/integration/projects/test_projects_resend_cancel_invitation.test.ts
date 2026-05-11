import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import { ProjectRole } from "../../../src/models/project.model";
import { createAccessToken, createUser } from "../../utils/auth-fixtures";
import { projectsRoot } from "../../utils/project-fixtures";
import transporter from "../../../src/config/mail.config";
import { testClient } from "../../utils/test-client";

describe("POST /api/v1/projects/:projectId/invitations/:invitationId/resend", () => {
  beforeEach(() => {
    vi.mocked(transporter.sendMail).mockClear();
  });

  it("renews pending invite email and rotates token", async () => {
    const owner = await createUser({
      email: "resc-own@example.com",
      username: "rescown",
    });
    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Lifecycle" });

    const id = created.body.data.id as string;

    const invited = await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "lifecycle@example.com", role: ProjectRole.ADMIN });

    const invitationId = invited.body.data.id as string;

    const resend = await testClient()
      .post(`${projectsRoot}/${id}/invitations/${invitationId}/resend`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(resend.status).toBe(StatusCodes.OK);
    expect(vi.mocked(transporter.sendMail)).toHaveBeenCalled();

    await testClient()
      .delete(`${projectsRoot}/${id}/invitations/${invitationId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    const resendBad = await testClient()
      .post(`${projectsRoot}/${id}/invitations/${invitationId}/resend`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(resendBad.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it("returns 404 when invitation id does not exist for project", async () => {
    const owner = await createUser({
      email: "inv-miss-own@example.com",
      username: "invmissown",
    });
    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Phantom Invites" });

    const projectId = created.body.data.id as string;
    const phantomId = new Types.ObjectId().toString();

    const resend = await testClient()
      .post(`${projectsRoot}/${projectId}/invitations/${phantomId}/resend`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(resend.status).toBe(StatusCodes.NOT_FOUND);
  });
});

describe("DELETE /api/v1/projects/:projectId/invitations/:invitationId", () => {
  beforeEach(() => {
    vi.mocked(transporter.sendMail).mockClear();
  });

  it("returns 404 when invitation id does not exist for project", async () => {
    const owner = await createUser({
      email: "inv-miss-cancel@example.com",
      username: "invmisc",
    });
    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Phantom Cancel" });

    const projectId = created.body.data.id as string;
    const phantomId = new Types.ObjectId().toString();

    const cancel = await testClient()
      .delete(`${projectsRoot}/${projectId}/invitations/${phantomId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(cancel.status).toBe(StatusCodes.NOT_FOUND);
  });

  it("returns 400 when cancelling twice", async () => {
    const owner = await createUser({
      email: "inv-twice-own@example.com",
      username: "invtwown",
    });
    const ownerToken = createAccessToken(owner.user._id.toString(), owner.user.email);

    const created = await testClient()
      .post(`${projectsRoot}/`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Double Cancel" });

    const id = created.body.data.id as string;

    const invited = await testClient()
      .post(`${projectsRoot}/${id}/invitations`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "twice-cancel@example.com" });

    const invitationId = invited.body.data.id as string;

    const first = await testClient()
      .delete(`${projectsRoot}/${id}/invitations/${invitationId}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(first.status).toBe(StatusCodes.OK);

    const second = await testClient()
      .delete(`${projectsRoot}/${id}/invitations/${invitationId}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(second.status).toBe(StatusCodes.BAD_REQUEST);
    expect(second.body.error.message.toLowerCase()).toContain("cancelled");
  });
});
