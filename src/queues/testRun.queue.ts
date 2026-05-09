import { Job, Queue } from "bullmq";
import { createRedisConnection } from "../config/redis.config";

export const TEST_RUN_QUEUE_NAME = "test-run-queue";

export interface TestRunJobPayload {
  testCaseId: string;
  projectId: string;
  triggeredBy: string;
}

const connection = createRedisConnection();

export const testRunQueue = new Queue<TestRunJobPayload>(TEST_RUN_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export const enqueueTestRun = async (payload: TestRunJobPayload) => {
  return await testRunQueue.add("execute-test-case", payload);
};

export const mapQueuedJob = (job: Job<TestRunJobPayload>) => ({
  id: job.id,
  name: job.name,
  queuedAt: new Date(job.timestamp).toISOString(),
});
