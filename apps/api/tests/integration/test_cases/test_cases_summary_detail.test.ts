import { StatusCodes } from "http-status-codes";
import { ProjectRole } from "../../../src/models/project.model";
import { createAccessToken, createUser } from "../../utils/auth-fixtures";
import {
  createProjectForTestCases,
  inviteUserToRole,
  minimalLoadTestCasePayload,
  seedTestRunSummary,
  testCasesPath,
} from "../../utils/test-case-fixtures";
import { testClient } from "../../utils/test-client";

describe("GET /api/v1/projects/:projectId/test-cases/:testCaseId/summaries/:summaryId", () => {
  it("loads the hydrated summary aggregate", async () => {
    const ctx = await createProjectForTestCases("tcsr1");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const tcId = created.body.data.testCase._id as string;
    const { summaryId } = await seedTestRunSummary({
      projectId: ctx.projectId,
      testCaseId: tcId,
      triggeredBy: String(ctx.owner._id),
    });

    const res = await testClient()
      .get(`${testCasesPath(ctx.projectId)}/${tcId}/summaries/${summaryId}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.data.jobId).toBeTruthy();
    expect(String(res.body.data.testCase)).toBe(tcId);
  });

  it("returns 404 when summary id mismatches linkage", async () => {
    const ctx = await createProjectForTestCases("tcsr2");

    const a = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({ ...minimalLoadTestCasePayload(), name: "Case A" });

    const b = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({ ...minimalLoadTestCasePayload(), name: "Case B" });

    const tcA = a.body.data.testCase._id as string;
    const tcB = b.body.data.testCase._id as string;

    const { summaryId } = await seedTestRunSummary({
      projectId: ctx.projectId,
      testCaseId: tcB,
      triggeredBy: String(ctx.owner._id),
    });

    const res = await testClient()
      .get(`${testCasesPath(ctx.projectId)}/${tcA}/summaries/${summaryId}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    expect(res.status).toBe(StatusCodes.NOT_FOUND);
  });

  it("requires project access", async () => {
    const ctx = await createProjectForTestCases("tcsr3");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const tcId = created.body.data.testCase._id as string;
    const { summaryId } = await seedTestRunSummary({
      projectId: ctx.projectId,
      testCaseId: tcId,
      triggeredBy: String(ctx.owner._id),
    });

    const outsider = await createUser({
      email: "tcsr-out@example.com",
      username: "tcsrout",
    });

    const denied = await testClient()
      .get(`${testCasesPath(ctx.projectId)}/${tcId}/summaries/${summaryId}`)
      .set(
        "Authorization",
        `Bearer ${createAccessToken(outsider.user._id.toString(), outsider.user.email)}`,
      );

    expect(denied.status).toBe(StatusCodes.FORBIDDEN);
  });

  it("honours viewer read rights", async () => {
    const ctx = await createProjectForTestCases("tcsr4");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const tcId = created.body.data.testCase._id as string;
    const { summaryId } = await seedTestRunSummary({
      projectId: ctx.projectId,
      testCaseId: tcId,
      triggeredBy: String(ctx.owner._id),
    });

    const { accessToken } = await inviteUserToRole(
      ctx.projectId,
      ctx.ownerToken,
      "tcsrview@example.com",
      ProjectRole.VIEWER,
    );

    const res = await testClient()
      .get(`${testCasesPath(ctx.projectId)}/${tcId}/summaries/${summaryId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(StatusCodes.OK);
  });

  it("returns 400 for malformed params", async () => {
    const ctx = await createProjectForTestCases("tcsr5");

    const res = await testClient()
      .get(
        `${testCasesPath(ctx.projectId)}/bad-id/summaries/507f191e810c19729de860ea`,
      )
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it("returns 400 when summaryId is not a Mongo id", async () => {
    const ctx = await createProjectForTestCases("tcsr-bad-sum");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const tcId = created.body.data.testCase._id as string;

    const res = await testClient()
      .get(`${testCasesPath(ctx.projectId)}/${tcId}/summaries/not-summary-id`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it("returns 404 when no summary matches the ids", async () => {
    const ctx = await createProjectForTestCases("tcsr-miss-sum");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const tcId = created.body.data.testCase._id as string;

    const res = await testClient()
      .get(
        `${testCasesPath(ctx.projectId)}/${tcId}/summaries/507f191e810c19729de860ea`,
      )
      .set("Authorization", `Bearer ${ctx.ownerToken}`);

    expect(res.status).toBe(StatusCodes.NOT_FOUND);
  });
});
