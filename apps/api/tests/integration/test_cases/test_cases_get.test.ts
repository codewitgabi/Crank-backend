import { StatusCodes } from "http-status-codes";
import { ProjectRole } from "../../../src/models/project.model";
import { createAccessToken, createUser } from "../../utils/auth-fixtures";
import { projectsRoot } from "../../utils/project-fixtures";
import {
  createProjectForTestCases,
  inviteUserToRole,
  minimalLoadTestCasePayload,
  seedTestRunSummary,
  testCasesPath,
} from "../../utils/test-case-fixtures";
import { testClient } from "../../utils/test-client";

describe("GET /api/v1/projects/:projectId/test-cases/:testCaseId", () => {
  it("returns the document with summary stubs", async () => {
    const ctx = await createProjectForTestCases("tcgt1");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({ ...minimalLoadTestCasePayload(), name: "Detail Row" });

    const tcId = created.body.data.testCase._id as string;

    await seedTestRunSummary({
      projectId: ctx.projectId,
      testCaseId: tcId,
      triggeredBy: String(ctx.owner._id),
    });

    const res = await testClient()
      .get(`${testCasesPath(ctx.projectId)}/${tcId}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.data.name).toBe("Detail Row");
    expect(Array.isArray(res.body.data.summaries)).toBe(true);
    expect(res.body.data.summaries.length).toBeGreaterThanOrEqual(1);
  });

  it("returns 403 for outsiders", async () => {
    const ctx = await createProjectForTestCases("tcgt2");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const outsider = await createUser({
      email: "tcgt-out@example.com",
      username: "tcgtout",
    });

    const res = await testClient()
      .get(
        `${testCasesPath(ctx.projectId)}/${created.body.data.testCase._id as string}`,
      )
      .set(
        "Authorization",
        `Bearer ${createAccessToken(outsider.user._id.toString(), outsider.user.email)}`,
      );

    expect(res.status).toBe(StatusCodes.FORBIDDEN);
  });

  it("returns 404 for unknown or soft-deleted test cases", async () => {
    const ctx = await createProjectForTestCases("tcgt3");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const id = created.body.data.testCase._id as string;

    const missing = await testClient()
      .get(`${testCasesPath(ctx.projectId)}/507f191e810c19729de860ea`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);
    expect(missing.status).toBe(StatusCodes.NOT_FOUND);

    await testClient()
      .delete(`${testCasesPath(ctx.projectId)}/${id}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    const deleted = await testClient()
      .get(`${testCasesPath(ctx.projectId)}/${id}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);
    expect(deleted.status).toBe(StatusCodes.NOT_FOUND);
  });

  it("returns 400 for malformed identifiers", async () => {
    const ctx = await createProjectForTestCases("tcgt4");

    const res = await testClient()
      .get(`${projectsRoot}/${ctx.projectId}/test-cases/not-id`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it("returns 400 when projectId in the path is not a Mongo id", async () => {
    const ctx = await createProjectForTestCases("tcgt-badproj");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const tcId = created.body.data.testCase._id as string;

    const res = await testClient()
      .get(`${projectsRoot}/invalid-proj-id/test-cases/${tcId}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it("allows VIEWER read access", async () => {
    const ctx = await createProjectForTestCases("tcgt-view");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const { accessToken } = await inviteUserToRole(
      ctx.projectId,
      ctx.ownerToken,
      "tcgtviewer@example.com",
      ProjectRole.VIEWER,
    );

    const res = await testClient()
      .get(
        `${testCasesPath(ctx.projectId)}/${created.body.data.testCase._id as string}`,
      )
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(StatusCodes.OK);
  });
});
