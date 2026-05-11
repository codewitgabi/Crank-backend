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

describe("DELETE /api/v1/projects/:projectId/test-cases/:testCaseId", () => {
  it("soft deletes and hides the record from lookups", async () => {
    const ctx = await createProjectForTestCases("tcde1");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const id = created.body.data.testCase._id as string;

    const removed = await testClient()
      .delete(`${testCasesPath(ctx.projectId)}/${id}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);
    expect(removed.status).toBe(StatusCodes.OK);

    const missing = await testClient()
      .get(`${testCasesPath(ctx.projectId)}/${id}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);
    expect(missing.status).toBe(StatusCodes.NOT_FOUND);

    const again = await testClient()
      .delete(`${testCasesPath(ctx.projectId)}/${id}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);
    expect(again.status).toBe(StatusCodes.NOT_FOUND);
  });

  it("returns 403 for VIEWER", async () => {
    const ctx = await createProjectForTestCases("tcde-view");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const { accessToken } = await inviteUserToRole(
      ctx.projectId,
      ctx.ownerToken,
      "tcdviewer@example.com",
      ProjectRole.VIEWER,
    );

    const res = await testClient()
      .delete(
        `${testCasesPath(ctx.projectId)}/${created.body.data.testCase._id as string}`,
      )
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(StatusCodes.FORBIDDEN);
  });

  it("allows MEMBER to soft delete", async () => {
    const ctx = await createProjectForTestCases("tcde-member");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const id = created.body.data.testCase._id as string;
    const { accessToken } = await inviteUserToRole(
      ctx.projectId,
      ctx.ownerToken,
      "tcdmemdel@example.com",
      ProjectRole.MEMBER,
    );

    const res = await testClient()
      .delete(`${testCasesPath(ctx.projectId)}/${id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(StatusCodes.OK);
  });

  it("returns 403 when the caller is not a project member", async () => {
    const ctx = await createProjectForTestCases("tcde-out");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const outsider = await createUser({
      email: "tcde-out@example.com",
      username: "tcdeout",
    });

    const res = await testClient()
      .delete(
        `${testCasesPath(ctx.projectId)}/${created.body.data.testCase._id as string}`,
      )
      .set(
        "Authorization",
        `Bearer ${createAccessToken(outsider.user._id.toString(), outsider.user.email)}`,
      );

    expect(res.status).toBe(StatusCodes.FORBIDDEN);
  });

  it("returns 400 for a malformed test case id", async () => {
    const ctx = await createProjectForTestCases("tcde-bad-id");

    const res = await testClient()
      .delete(`${projectsRoot}/${ctx.projectId}/test-cases/not-mongo`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it("returns 404 when the id is syntactically valid but not present", async () => {
    const ctx = await createProjectForTestCases("tcde-miss");

    const res = await testClient()
      .delete(`${testCasesPath(ctx.projectId)}/507f191e810c19729de860ea`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    expect(res.status).toBe(StatusCodes.NOT_FOUND);
  });
});
