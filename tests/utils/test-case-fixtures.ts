import { Types } from "mongoose";
import {
  HttpMethod,
  TestCaseStatus,
  TestType,
} from "../../src/models/testCase.model";
import TestRunSummary from "../../src/models/testRunSummary.model";
import { ProjectRole } from "../../src/models/project.model";
import { createAccessToken, createUser } from "./auth-fixtures";
import { projectsRoot, extractInviteTokenFromLastEmail } from "./project-fixtures";
import { testClient } from "./test-client";

export const testCasesPath = (projectId: string) =>
  `/api/v1/projects/${projectId}/test-cases`;

/** Helps fire-and-forget handlers complete before asserting on DB-derived state */
export const flushBackgroundPromises = async (): Promise<void> => {
  for (let i = 0; i < 10; i += 1) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
};

export const minimalLoadTestCasePayload = (): Record<string, unknown> => ({
  name: "Example Load Probe",
  testType: TestType.LOAD,
  request: {
    method: HttpMethod.GET,
    url: "https://example.com/health",
    timeoutMs: 5000,
  },
  loadProfile: {
    vus: 1,
    durationSeconds: 30,
    rampUpSeconds: 0,
    rampDownSeconds: 0,
  },
});

export const minimalStressTestCasePayload = (): Record<string, unknown> => ({
  name: "Stress Case",
  testType: TestType.STRESS,
  request: {
    method: HttpMethod.GET,
    url: "https://example.com/api",
    timeoutMs: 5000,
  },
  stressProfile: {
    vus: 2,
    maxVus: 5,
    durationSeconds: 60,
    stepDurationSeconds: 10,
    rampUpSeconds: 0,
    rampDownSeconds: 0,
  },
});

export const minimalSpikeTestCasePayload = (): Record<string, unknown> => ({
  name: "Spike Case",
  testType: TestType.SPIKE,
  request: {
    method: HttpMethod.GET,
    url: "https://example.com/",
    timeoutMs: 5000,
  },
  spikeProfile: {
    baseVus: 1,
    spikeVus: 3,
    warmupSeconds: 0,
    spikeHoldSeconds: 5,
    cooldownSeconds: 0,
  },
});

export const minimalLatencyTestCasePayload = (): Record<string, unknown> => ({
  name: "Latency Case",
  testType: TestType.LATENCY,
  request: {
    method: HttpMethod.GET,
    url: "https://example.com/",
    timeoutMs: 5000,
  },
  latencyProfile: {
    vus: 1,
    durationSeconds: 30,
    rampUpSeconds: 0,
    rampDownSeconds: 0,
    customPoints: [
      { percentile: 50, thresholdMs: 500 },
      { percentile: 95, thresholdMs: 1500 },
    ],
  },
});

export type ProjectWithAuth = {
  projectId: string;
  ownerToken: string;
  owner: { _id: unknown; email: string };
};

export const createProjectForTestCases = async (
  emailPrefix: string,
): Promise<ProjectWithAuth> => {
  const { user } = await createUser({
    email: `${emailPrefix}-owner@example.com`,
    username: `${emailPrefix}own`,
  });
  const token = createAccessToken(user._id.toString(), user.email);

  const res = await testClient()
    .post(`${projectsRoot}/`)
    .set("Authorization", `Bearer ${token}`)
    .send({ name: `${emailPrefix} project` });

  return {
    projectId: res.body.data.id as string,
    ownerToken: token,
    owner: user,
  };
};

export async function inviteUserToRole(
  projectId: string,
  ownerBearerToken: string,
  memberEmail: string,
  role: ProjectRole.VIEWER | ProjectRole.MEMBER | ProjectRole.ADMIN,
): Promise<{ accessToken: string }> {
  const safeUsername =
    memberEmail.replace(/[^a-z0-9]+/gi, "").slice(0, 26) ||
    `m${memberEmail.length}x`;
  const memberBundle = await createUser({
    email: memberEmail,
    username: `${safeUsername}`.slice(0, 29),
  });

  await testClient()
    .post(`${projectsRoot}/${projectId}/invitations`)
    .set("Authorization", `Bearer ${ownerBearerToken}`)
    .send({ email: memberBundle.user.email, role });

  await testClient()
    .post(
      `${projectsRoot}/invitations/${extractInviteTokenFromLastEmail()}/accept`,
    )
    .set(
      "Authorization",
      `Bearer ${createAccessToken(memberBundle.user._id.toString(), memberBundle.user.email)}`,
    );

  return {
    accessToken: createAccessToken(memberBundle.user._id.toString(), memberBundle.user.email),
  };
}

export async function seedTestRunSummary(opts: {
  projectId: string;
  testCaseId: string;
  triggeredBy: string;
}): Promise<{ summaryId: string }> {
  const doc = await TestRunSummary.create({
    jobId: `fixture-${new Types.ObjectId().toString()}-${Date.now()}`,
    source: "inline",
    triggeredBy: new Types.ObjectId(opts.triggeredBy),
    project: new Types.ObjectId(opts.projectId),
    testCase: new Types.ObjectId(opts.testCaseId),
    testType: TestType.LOAD,
    plannedDurationSeconds: 2,
    wallClockMs: 10,
    requestsCompleted: 2,
    networkFailures: 0,
    assertionChecks: 1,
    assertionPasses: 1,
    assertionFailuresByRuleKey: {},
    statusHistogram: { "200": 2 },
  });
  return { summaryId: doc._id.toString() };
}
