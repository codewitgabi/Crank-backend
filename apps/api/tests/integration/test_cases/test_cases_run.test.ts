import { StatusCodes } from "http-status-codes";
import { ProjectRole } from "../../../src/models/project.model";
import { createAccessToken, createUser } from "../../utils/auth-fixtures";
import { projectsRoot } from "../../utils/project-fixtures";
import {
  createProjectForTestCases,
  flushBackgroundPromises,
  inviteUserToRole,
  minimalLoadTestCasePayload,
  testCasesPath,
} from "../../utils/test-case-fixtures";
import { testClient } from "../../utils/test-client";

describe("POST /api/v1/projects/:projectId/test-cases/:testCaseId/run", () => {
  it("responds 202 and eventually adds a runnable summary stub", async () => {
    const ctx = await createProjectForTestCases("tcru1");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const id = created.body.data.testCase._id as string;

    const started = await testClient()
      .post(`${testCasesPath(ctx.projectId)}/${id}/run`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    expect(started.status).toBe(StatusCodes.ACCEPTED);
    expect(started.body.data.jobId).toContain("manual:");
    expect(started.body.data.status).toBe("running");

    let detail = await testClient()
      .get(`${testCasesPath(ctx.projectId)}/${id}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    for (
      let attempt = 0;
      attempt < 30 && !detail.body.data.lastRunAt;
      attempt += 1
    ) {
      await flushBackgroundPromises();
      await new Promise<void>((r) => setTimeout(r, 25));
      detail = await testClient()
        .get(`${testCasesPath(ctx.projectId)}/${id}`)
        .set("Authorization", `Bearer ${ctx.ownerToken}`);
    }

    expect(detail.body.data.lastRunAt).toBeTruthy();
    expect(Array.isArray(detail.body.data.summaries)).toBe(true);
    expect(detail.body.data.summaries.length).toBeGreaterThan(0);
  });

  it("allows VIEWER to trigger async runs because they can observe results", async () => {
    const ctx = await createProjectForTestCases("tcru-view");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const { accessToken } = await inviteUserToRole(
      ctx.projectId,
      ctx.ownerToken,
      "tcrunner-view@example.com",
      ProjectRole.VIEWER,
    );

    const res = await testClient()
      .post(
        `${testCasesPath(ctx.projectId)}/${created.body.data.testCase._id as string}/run`,
      )
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(StatusCodes.ACCEPTED);
  });

  it("returns 404 when the payload points at a soft-deleted test case", async () => {
    const ctx = await createProjectForTestCases("tcru-del");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const id = created.body.data.testCase._id as string;

    await testClient()
      .delete(`${testCasesPath(ctx.projectId)}/${id}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    const res = await testClient()
      .post(`${testCasesPath(ctx.projectId)}/${id}/run`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    expect(res.status).toBe(StatusCodes.NOT_FOUND);
  });

  it("requires a reachable test-case id scoped to project", async () => {
    const ctx = await createProjectForTestCases("tcru-miss");

    const res = await testClient()
      .post(`${testCasesPath(ctx.projectId)}/507f191e810c19729de860ea/run`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    expect(res.status).toBe(StatusCodes.NOT_FOUND);
  });

  it("returns 403 when the caller is not a project member", async () => {
    const ctx = await createProjectForTestCases("tcru-out");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const outsider = await createUser({
      email: "tcru-out@example.com",
      username: "tcruout",
    });

    const res = await testClient()
      .post(
        `${testCasesPath(ctx.projectId)}/${created.body.data.testCase._id as string}/run`,
      )
      .set(
        "Authorization",
        `Bearer ${createAccessToken(outsider.user._id.toString(), outsider.user.email)}`,
      );

    expect(res.status).toBe(StatusCodes.FORBIDDEN);
  });

  it("returns 400 for a malformed test case id", async () => {
    const ctx = await createProjectForTestCases("tcru-bad-id");

    const res = await testClient()
      .post(`${projectsRoot}/${ctx.projectId}/test-cases/not-mongo/run`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });
});
