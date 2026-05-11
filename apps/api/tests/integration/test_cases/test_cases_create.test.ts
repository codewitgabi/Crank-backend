import { StatusCodes } from "http-status-codes";
import {
  HttpMethod,
  TestCaseStatus,
  TestType,
} from "../../../src/models/testCase.model";
import { ProjectRole } from "../../../src/models/project.model";
import { projectsRoot } from "../../utils/project-fixtures";
import {
  createProjectForTestCases,
  inviteUserToRole,
  minimalLatencyTestCasePayload,
  minimalLoadTestCasePayload,
  minimalSpikeTestCasePayload,
  minimalStressTestCasePayload,
  testCasesPath,
} from "../../utils/test-case-fixtures";
import { testClient } from "../../utils/test-client";

describe("POST /api/v1/projects/:projectId/test-cases", () => {
  it("creates a LOAD test case with mocked queue metadata", async () => {
    const ctx = await createProjectForTestCases("tccr1");

    const res = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.data.testCase).toBeTruthy();
    expect(res.body.data.testCase.name).toBe("Example Load Probe");
    expect(res.body.data.testCase.testType).toBe(TestType.LOAD);
    expect(res.body.data.queuedJob).toBeTruthy();
    expect(res.body.data.queuedJob.id).toBe("integration-mock-queue-job");
    expect(res.body.message).toMatch(/queued/i);
  });

  it("creates STRESS, SPIKE, and LATENCY shaped cases when profiles are valid", async () => {
    const ctx = await createProjectForTestCases("tccr-multi");

    const stress = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalStressTestCasePayload());

    expect(stress.status).toBe(StatusCodes.CREATED);

    const spike = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalSpikeTestCasePayload());

    expect(spike.status).toBe(StatusCodes.CREATED);

    const lat = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLatencyTestCasePayload());

    expect(lat.status).toBe(StatusCodes.CREATED);
    expect(lat.body.data.testCase.latencyProfile.customPoints.length).toBe(2);
  });

  it("accepts slug, tags, optional status and request headers", async () => {
    const ctx = await createProjectForTestCases("tccr-opt");

    const res = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({
        ...minimalLoadTestCasePayload(),
        name: "Tagged Case",
        slug: "custom-slug-tc",
        status: TestCaseStatus.ACTIVE,
        tags: ["smoke", "api"],
        request: {
          method: HttpMethod.POST,
          url: "https://example.com/graphql",
          timeoutMs: 1000,
          headers: { "x-api-key": "abc" },
        },
      });

    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.data.testCase.slug).toBe("custom-slug-tc");
    expect(res.body.data.testCase.tags.sort()).toEqual(["api", "smoke"]);
    expect(res.body.data.testCase.status).toBe(TestCaseStatus.ACTIVE);
  });

  it("allows MEMBER role to author new cases", async () => {
    const ctx = await createProjectForTestCases("tccr-member-write");

    const { accessToken } = await inviteUserToRole(
      ctx.projectId,
      ctx.ownerToken,
      "tcmem-write@example.com",
      ProjectRole.MEMBER,
    );

    const res = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...minimalLoadTestCasePayload(), name: "Authored By Member" });

    expect(res.status).toBe(StatusCodes.CREATED);
  });

  it("returns 403 for VIEWER", async () => {
    const ctx = await createProjectForTestCases("tccr-view");

    const { accessToken } = await inviteUserToRole(
      ctx.projectId,
      ctx.ownerToken,
      "tcc-view@example.com",
      ProjectRole.VIEWER,
    );

    const res = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send(minimalLoadTestCasePayload());

    expect(res.status).toBe(StatusCodes.FORBIDDEN);
  });

  it("validates required fields from express-validator", async () => {
    const ctx = await createProjectForTestCases("tccr-val");

    const missingName = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({
        ...minimalLoadTestCasePayload(),
        name: "",
      });
    expect(missingName.status).toBe(StatusCodes.BAD_REQUEST);

    const missingType = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({
        ...minimalLoadTestCasePayload(),
        testType: "",
      });
    expect(missingType.status).toBe(StatusCodes.BAD_REQUEST);

    const badType = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({
        ...minimalLoadTestCasePayload(),
        testType: "VOLCANO",
      });
    expect(badType.status).toBe(StatusCodes.BAD_REQUEST);

    const badUrl = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({
        ...minimalLoadTestCasePayload(),
        request: {
          method: HttpMethod.GET,
          url: "::not::a::uri::",
        },
      });
    expect(badUrl.status).toBe(StatusCodes.BAD_REQUEST);

    const badSlug = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({
        ...minimalLoadTestCasePayload(),
        slug: "bad_slug",
      });
    expect(badSlug.status).toBe(StatusCodes.BAD_REQUEST);

    const badStatus = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({
        ...minimalLoadTestCasePayload(),
        status: "PUBLISHED",
      });
    expect(badStatus.status).toBe(StatusCodes.BAD_REQUEST);

    const timeoutHigh = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({
        ...minimalLoadTestCasePayload(),
        request: {
          method: HttpMethod.GET,
          url: "https://example.com/health",
          timeoutMs: 999_999,
        },
      });
    expect(timeoutHigh.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it("returns 422 when mongoose requires a LOAD profile but none is supplied", async () => {
    const ctx = await createProjectForTestCases("tccr-mongo");

    const res = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({
        name: "Missing Profile",
        testType: TestType.LOAD,
        request: {
          method: HttpMethod.GET,
          url: "https://example.com/",
        },
      });

    expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
  });

  it("returns 422 for schema rule violations unique to LOAD ramp timing", async () => {
    const ctx = await createProjectForTestCases("tccr-ramp");

    const res = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({
        ...minimalLoadTestCasePayload(),
        loadProfile: {
          vus: 1,
          durationSeconds: 5,
          rampUpSeconds: 4,
          rampDownSeconds: 4,
        },
      });

    expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
  });

  it("returns 422 when STRESS maxVus is below vus", async () => {
    const ctx = await createProjectForTestCases("tccr-stmx");

    const res = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({
        ...minimalStressTestCasePayload(),
        stressProfile: {
          vus: 10,
          maxVus: 5,
          durationSeconds: 60,
          stepDurationSeconds: 10,
          rampUpSeconds: 0,
          rampDownSeconds: 0,
        },
      });

    expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
  });

  it("returns 422 when spikeVus does not exceed baseVus", async () => {
    const ctx = await createProjectForTestCases("tccr-spkv");

    const res = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({
        ...minimalSpikeTestCasePayload(),
        spikeProfile: {
          baseVus: 5,
          spikeVus: 5,
          warmupSeconds: 0,
          spikeHoldSeconds: 5,
          cooldownSeconds: 0,
        },
      });

    expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
  });

  it("returns 422 for duplicate LATENCY percentiles", async () => {
    const ctx = await createProjectForTestCases("tccr-duppct");

    const res = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({
        ...minimalLatencyTestCasePayload(),
        latencyProfile: {
          vus: 1,
          durationSeconds: 30,
          rampUpSeconds: 0,
          rampDownSeconds: 0,
          customPoints: [
            { percentile: 50, thresholdMs: 100 },
            { percentile: 50, thresholdMs: 200 },
          ],
        },
      });

    expect(res.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
  });

  it("fails when slug collides in the same project", async () => {
    const ctx = await createProjectForTestCases("tccr-dupe");

    const first = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({
        ...minimalLoadTestCasePayload(),
        name: "Same Slug",
        slug: "fixed-slug",
      });
    expect(first.status).toBe(StatusCodes.CREATED);

    const second = await testClient()
      .post(`${testCasesPath(ctx.projectId)}`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send({
        ...minimalLoadTestCasePayload(),
        name: "Other Name",
        slug: "fixed-slug",
      });

    expect(second.status).not.toBe(StatusCodes.CREATED);
  });

  it("requires a real project membership for unknown projects", async () => {
    const ctx = await createProjectForTestCases("tccr-noproj");

    const res = await testClient()
      .post(`${projectsRoot}/507f1f77bcf86cd799439011/test-cases`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    expect(res.status).toBe(StatusCodes.NOT_FOUND);
  });

  it("returns 400 when projectId in the path is not a Mongo id", async () => {
    const ctx = await createProjectForTestCases("tccr-badproj");

    const res = await testClient()
      .post(`${projectsRoot}/not-a-mongo-id/test-cases`)
      .set("Authorization", `Bearer ${ctx.ownerToken}`)
      .send(minimalLoadTestCasePayload());

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });
});
