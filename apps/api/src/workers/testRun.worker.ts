import { Job, Worker } from "bullmq";
import mongoose from "mongoose";
import { createRedisConnection } from "../config/redis.config";
import { executeTestRunAndPersist } from "../services/testRunExecution.service";
import {
  TEST_RUN_QUEUE_NAME,
  TestRunJobPayload,
} from "../queues/testRun.queue";
import sysLogger, { createLogger, flushLogs } from "../utils/logger";

const workerConnection = createRedisConnection();
const baseLog = createLogger({ module: "test-run-worker", queue: TEST_RUN_QUEUE_NAME });

const processTestRun = async (job: Job<TestRunJobPayload>) => {
  const { testCaseId, projectId, triggeredBy } = job.data;
  const jobIdStr =
    job.id !== undefined && job.id !== null
      ? String(job.id)
      : `worker-fallback-${Date.now()}`;

  const log = baseLog.child({
    bullmqJobId: job.id,
    jobIdStr,
    testCaseId,
    projectId,
    triggeredBy,
  });

  const startedAt = Date.now();

  log.info("START job — worker will load test case and run load test");

  try {
    if (mongoose.connection.readyState !== 1) {
      log.error(
        { mongoReadyState: mongoose.connection.readyState },
        "ERROR MongoDB not connected; aborting job",
      );
      throw new Error("MongoDB is not connected; cannot run test");
    }

    log.info("MongoDB connected — calling executeTestRunAndPersist");

    const { summary, summaryDocId } = await executeTestRunAndPersist(
      testCaseId,
      projectId,
      triggeredBy,
      jobIdStr,
      "worker",
    );

    const wallClockMsJob = Date.now() - startedAt;

    log.info(
      {
        summaryId: summaryDocId.toString(),
        wallClockMsJob,
        plannedDurationSeconds: summary.plannedDurationSeconds,
        requestsCompleted: summary.requestsCompleted,
        networkFailures: summary.networkFailures,
        assertionChecks: summary.assertionChecks,
        assertionPasses: summary.assertionPasses,
        statusHistogram: summary.statusHistogram,
      },
      "END job success — summary persisted",
    );
  } catch (err: unknown) {
    const wallClockMsJob = Date.now() - startedAt;
    log.error(
      {
        err,
        wallClockMsJob,
      },
      "END job ERROR — see stack; job will be marked failed in BullMQ",
    );
    throw err;
  } finally {
    await flushLogs();
  }
};

export const testRunWorker = new Worker<TestRunJobPayload>(
  TEST_RUN_QUEUE_NAME,
  processTestRun,
  {
    connection: workerConnection,
    concurrency: 5,
  },
);

testRunWorker.on("active", (job) => {
  baseLog.info(
    {
      bullmqJobId: job.id,
      payload: job.data,
    },
    "QUEUE event: job active (picked up from Redis)",
  );
});

testRunWorker.on("completed", (job, result) => {
  baseLog.info(
    { bullmqJobId: job.id, payload: job.data, returnValue: result },
    "QUEUE event: job completed (handler returned)",
  );
  void flushLogs();
});

testRunWorker.on("failed", (job, err) => {
  baseLog.error(
    {
      bullmqJobId: job?.id,
      payload: job?.data,
      err,
      attemptsMade: job?.attemptsMade,
    },
    "QUEUE event: job failed",
  );
  void flushLogs();
});

testRunWorker.on("error", (err) => {
  baseLog.error({ err }, "QUEUE event: worker runtime error");
  void flushLogs();
});

testRunWorker.on("stalled", (jobId: string) => {
  baseLog.warn({ jobId }, "QUEUE event: job stalled (may retry)");
});

sysLogger.info(
  { queueName: TEST_RUN_QUEUE_NAME, concurrency: 5 },
  "Test run BullMQ worker listening — logs use module=test-run-worker",
);

void flushLogs();
