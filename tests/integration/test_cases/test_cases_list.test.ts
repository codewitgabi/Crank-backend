import { StatusCodes } from "http-status-codes";
import { ProjectRole } from "../../../src/models/project.model";
import { createAccessToken, createUser } from "../../utils/auth-fixtures";
import { projectsRoot } from "../../utils/project-fixtures";
import {
  createProjectForTestCases,
  inviteUserToRole,
  minimalLoadTestCasePayload,
  testCasesPath,
} from "../../utils/test-case-fixtures";
import { testClient } from "../../utils/test-client";

describe("GET /api/v1/projects/:projectId/test-cases", () => {
  it("requires authentication", async () => {
    const ctx = await createProjectForTestCases("tclist-auth");

    const res = await testClient().get(`${testCasesPath(ctx.projectId)}`);

    expect(res.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  it("requires project membership", async () => {
    const ctx = await createProjectForTestCases("tclist1");
    const stranger = await createUser({
      email: "tclist-str@example.com",
      username: "tcliststr",
    });

    const res = await testClient()
      .get(`${testCasesPath(ctx.projectId)}`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(stranger.user._id.toString(), stranger.user.email)}`,
      );

    expect(res.status).toBe(StatusCodes.FORBIDDEN);
  });

  it("returns 400 for an invalid project id", async () => {
    const ctx = await createProjectForTestCases("tclist-bad");

    const res = await testClient()
      .get(`${projectsRoot}/not-a-mongo-id/test-cases`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it("returns 404 when the project does not exist", async () => {
    const ctx = await createProjectForTestCases("tclist-nf");

    const res = await testClient()
      .get(`${projectsRoot}/507f1f77bcf86cd799439011/test-cases`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    expect(res.status).toBe(StatusCodes.NOT_FOUND);
  });

  it("lists active test cases newest-updated first", async () => {
    const ctx = await createProjectForTestCases("tclist2");

    await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({ ...minimalLoadTestCasePayload(), name: "Older Row" });

    const second = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({ ...minimalLoadTestCasePayload(), name: "Younger Row" });

    const tcId = second.body.data.testCase._id as string;
    await testClient()
      .patch(`${testCasesPath(ctx.projectId)}/${tcId}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({ description: "touch" });

    const res = await testClient()
      .get(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    expect(res.status).toBe(StatusCodes.OK);
    const rows = res.body.data as Array<{ name: string }>;
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("Younger Row");
  });

  it("omits soft-deleted cases from the listing", async () => {
    const ctx = await createProjectForTestCases("tclist-del");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({ ...minimalLoadTestCasePayload(), name: "Soon Gone" });

    const id = created.body.data.testCase._id as string;

    await testClient()
      .delete(`${testCasesPath(ctx.projectId)}/${id}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    const list = await testClient()
      .get(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    expect(list.status).toBe(StatusCodes.OK);
    expect(
      (list.body.data as unknown[]).some(
        (r: { name: string }) => (r as { name: string }).name === "Soon Gone",
      ),
    ).toBe(false);
  });

  it("allows VIEWER to list", async () => {
    const ctx = await createProjectForTestCases("tclist-view");
    const { accessToken: viewerToken } = await inviteUserToRole(
      ctx.projectId,
      ctx.ownerToken,
      "tcview@example.com",
      ProjectRole.VIEWER,
    );

    const res = await testClient()
      .get(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(StatusCodes.OK);
  });

  it("allows MEMBER to list", async () => {
    const ctx = await createProjectForTestCases("tclist-member");
    const { accessToken: memberToken } = await inviteUserToRole(
      ctx.projectId,
      ctx.ownerToken,
      "tcmember@example.com",
      ProjectRole.MEMBER,
    );

    const res = await testClient()
      .get(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(res.status).toBe(StatusCodes.OK);
  });
});
