import { Types } from "mongoose";
import TestCase from "../models/testCase.model";
import TestRunSummary, {
  type TestRunSummarySource,
} from "../models/testRunSummary.model";
import { NotFoundError } from "../utils/api.errors";
import { createLogger } from "../utils/logger";
import {
  LeanTestCaseForRun,
  runLoadTestAgainstCase,
  RunExecutionSummary,
} from "./testRun.executor";

async function persistSummary(
  jobId: string,
  triggeredBy: string,
  projectId: string,
  testCaseId: string,
  summary: RunExecutionSummary,
  source: TestRunSummarySource,
): Promise<{ summaryDocId: Types.ObjectId }> {
  const stored = await TestRunSummary.create({
    jobId,
    source,
    triggeredBy: new Types.ObjectId(triggeredBy),
    project: new Types.ObjectId(projectId),
    testCase: new Types.ObjectId(testCaseId),
    testType: summary.testType,
    plannedDurationSeconds: summary.plannedDurationSeconds,
    wallClockMs: summary.wallClockMs,
    requestsCompleted: summary.requestsCompleted,
    networkFailures: summary.networkFailures,
    assertionChecks: summary.assertionChecks,
    assertionPasses: summary.assertionPasses,
    assertionFailuresByRuleKey: summary.assertionFailuresByRuleKey,
    latencyPercentileChecks: summary.latencyPercentileChecks ?? [],
    statusHistogram: summary.statusHistogram,
  });

  await TestCase.updateOne(
    { _id: testCaseId, project: projectId, deletedAt: null },
    {
      $set: {
        lastRunAt: new Date(),
        updatedBy: new Types.ObjectId(triggeredBy),
      },
    },
  );

  return { summaryDocId: stored._id as Types.ObjectId };
}

/**
 * Load test case, run executor, persist TestRunSummary and update TestCase timestamps.
 */
export async function executeTestRunAndPersist(
  testCaseId: string,
  projectId: string,
  triggeredBy: string,
  jobId: string,
  source: TestRunSummarySource,
): Promise<{ summary: RunExecutionSummary; summaryDocId: Types.ObjectId }> {
  const log = createLogger({
    module: "testRunExecution",
    jobId,
    testCaseId,
    projectId,
    source,
  });

  log.info("START executeTestRunAndPersist");

  try {
    const doc = await TestCase.findOne({
      _id: testCaseId,
      project: projectId,
      deletedAt: null,
    }).lean();

    if (!doc) {
      log.error({}, "Test case document not found — aborting");
      throw new NotFoundError("Test case not found");
    }

    log.info(
      {
        testType: doc.testType,
        name: doc.name,
        slug: doc.slug,
      },
      "LOAD PHASE begin — runLoadTestAgainstCase (this may take durationSeconds)",
    );

    const summary = await runLoadTestAgainstCase(doc as LeanTestCaseForRun);

    log.info(
      {
        plannedDurationSeconds: summary.plannedDurationSeconds,
        wallClockMs: summary.wallClockMs,
        requestsCompleted: summary.requestsCompleted,
        networkFailures: summary.networkFailures,
      },
      "LOAD PHASE end — persisting TestRunSummary + updating TestCase.lastRunAt",
    );

    const { summaryDocId } = await persistSummary(
      jobId,
      triggeredBy,
      projectId,
      testCaseId,
      summary,
      source,
    );

    log.info({ summaryId: summaryDocId.toString() }, "SUCCESS persist complete");

    return { summary, summaryDocId };
  } catch (err: unknown) {
    log.error({ err }, "ERROR executeTestRunAndPersist");
    throw err;
  }
}
