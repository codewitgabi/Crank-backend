import { StatusCodes } from "http-status-codes";
import {
  createProjectForTestCases,
  minimalLoadTestCasePayload,
  seedTestRunSummary,
  testCasesPath,
} from "../../utils/test-case-fixtures";
import { testClient } from "../../utils/test-client";

describe("Test-case routes reject unauthenticated calls", () => {
  const assertUnauthorized = (status: number) => {
    expect(status).toBe(StatusCodes.UNAUTHORIZED);
  };

  it("POST /projects/:projectId/test-cases", async () => {
    const ctx = await createProjectForTestCases("tcra-post");

    const res = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .send(minimalLoadTestCasePayload());

    assertUnauthorized(res.status);
  });

  it("GET /projects/:projectId/test-cases/:testCaseId", async () => {
    const ctx = await createProjectForTestCases("tcra-get-one");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const id = created.body.data.testCase._id as string;

    const res = await testClient().get(`${testCasesPath(ctx.projectId)}/${id}`);
    assertUnauthorized(res.status);
  });

  it("PATCH /projects/:projectId/test-cases/:testCaseId", async () => {
    const ctx = await createProjectForTestCases("tcra-patch");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const id = created.body.data.testCase._id as string;

    const res = await testClient()
      .patch(`${testCasesPath(ctx.projectId)}/${id}`)
      .send({ description: "x" });
    assertUnauthorized(res.status);
  });

  it("DELETE /projects/:projectId/test-cases/:testCaseId", async () => {
    const ctx = await createProjectForTestCases("tcra-del");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const id = created.body.data.testCase._id as string;

    const res = await testClient().delete(
      `${testCasesPath(ctx.projectId)}/${id}`,
    );
    assertUnauthorized(res.status);
  });

  it("POST /projects/:projectId/test-cases/:testCaseId/run", async () => {
    const ctx = await createProjectForTestCases("tcra-run");

    const created = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    const id = created.body.data.testCase._id as string;

    const res = await testClient().post(
      `${testCasesPath(ctx.projectId)}/${id}/run`,
    );
    assertUnauthorized(res.status);
  });

  it("GET /projects/:projectId/test-cases/:testCaseId/summaries/:summaryId", async () => {
    const ctx = await createProjectForTestCases("tcra-sum");

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

    const res = await testClient().get(
      `${testCasesPath(ctx.projectId)}/${tcId}/summaries/${summaryId}`,
    );
    assertUnauthorized(res.status);
  });

  it("GET /projects/:projectId/test-cases (list)", async () => {
    const ctx = await createProjectForTestCases("tcra-list");

    const res = await testClient().get(`${testCasesPath(ctx.projectId)}`);

    assertUnauthorized(res.status);
  });
});
