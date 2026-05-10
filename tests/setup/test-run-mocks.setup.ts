import { vi } from "vitest";
import mongoose from "mongoose";

/**
 * Isolate integration tests from Redis/BullMQ and from real duration-based executors.
 * Real workers should be tested separately; APIs only need deterministic responses.
 */

vi.mock("../../src/queues/testRun.queue", () => ({
  TEST_RUN_QUEUE_NAME: "test-run-queue",
  testRunQueue: {},
  enqueueTestRun: vi.fn(() =>
    Promise.resolve({
      id: "integration-mock-queue-job",
      name: "execute-test-case",
      timestamp: Date.now(),
    }),
  ),
  mapQueuedJob: (job: {
    id: unknown;
    name: string;
    timestamp: number;
  }) => ({
    id: String(job.id),
    name: job.name,
    queuedAt: new Date(job.timestamp).toISOString(),
  }),
}));

vi.mock("../../src/services/testRunExecution.service", () => ({
  executeTestRunAndPersist: vi.fn(
    async (
      testCaseId: string,
      projectId: string,
      triggeredBy: string,
      jobId: string,
      source: "worker" | "inline",
    ) => {
      const TestRunSummary = (await import("../../src/models/testRunSummary.model")).default;
      const TestCaseModel = (await import("../../src/models/testCase.model")).default;
      const { TestType } = await import("../../src/models/testCase.model");

      const stored = await TestRunSummary.create({
        jobId,
        source,
        triggeredBy: new mongoose.Types.ObjectId(triggeredBy),
        project: new mongoose.Types.ObjectId(projectId),
        testCase: new mongoose.Types.ObjectId(testCaseId),
        testType: TestType.LOAD,
        plannedDurationSeconds: 1,
        wallClockMs: 2,
        requestsCompleted: 1,
        networkFailures: 0,
        assertionChecks: 0,
        assertionPasses: 0,
        assertionFailuresByRuleKey: {},
        statusHistogram: { "200": 1 },
      });

      await TestCaseModel.updateOne(
        { _id: testCaseId, project: projectId },
        {
          $set: {
            lastRunAt: new Date(),
            updatedBy: new mongoose.Types.ObjectId(triggeredBy),
          },
        },
      );

      return {
        summary: {
          testType: TestType.LOAD,
          plannedDurationSeconds: 1,
          wallClockMs: 2,
          requestsCompleted: 1,
          networkFailures: 0,
          assertionChecks: 0,
          assertionPasses: 0,
          assertionFailuresByRuleKey: {} as Record<string, number>,
          statusHistogram: { "200": 1 },
        },
        summaryDocId: stored._id as mongoose.Types.ObjectId,
      };
    },
  ),
}));
