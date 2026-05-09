import { randomUUID } from "crypto";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import Project, { IProject, ProjectRole } from "../models/project.model";
import TestCase from "../models/testCase.model";
import TestRunSummary from "../models/testRunSummary.model";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/api.errors";
import { SuccessResponse } from "../utils/response";
import { enqueueTestRun, mapQueuedJob } from "../queues/testRun.queue";
import { executeTestRunAndPersist } from "../services/testRunExecution.service";
import sysLogger from "../utils/logger";

type TestCasePayload = Record<string, unknown>;

class TestCaseService {
  private getProjectRole(project: IProject, userId: string): ProjectRole | null {
    const member = project.members.find((m) => m.user.toString() === userId);
    return member?.role ?? null;
  }

  private ensureCanRead(project: IProject, userId: string) {
    const role = this.getProjectRole(project, userId);
    if (!role) {
      throw new ForbiddenError("You do not have access to this project");
    }
  }

  private ensureCanWrite(project: IProject, userId: string) {
    const role = this.getProjectRole(project, userId);
    if (!role || role === ProjectRole.VIEWER) {
      throw new ForbiddenError("Only owner/admin/member can perform this action");
    }
  }

  private async getProjectOrThrow(projectId: string) {
    const project = await Project.findOne({ _id: projectId, deletedAt: null });
    if (!project) {
      throw new NotFoundError("Project not found");
    }
    return project;
  }

  async listTestCasesForProject(userId: string, projectId: string) {
    const project = await this.getProjectOrThrow(projectId);
    this.ensureCanRead(project, userId);

    const rows = await TestCase.find({
      project: projectId,
      deletedAt: null,
    })
      .select(
        "name description tags createdAt updatedAt lastRunAt",
      )
      .sort({ updatedAt: -1 })
      .lean();

    const data = rows.map((row) => ({
      id: row._id,
      name: row.name,
      description: row.description ?? null,
      tags: row.tags,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastRunAt: row.lastRunAt ?? null,
    }));

    return SuccessResponse({
      message: "Test cases fetched successfully",
      data,
      httpStatus: StatusCodes.OK,
    });
  }

  async getTestCaseWithSummaries(
    userId: string,
    projectId: string,
    testCaseId: string,
  ) {
    const project = await this.getProjectOrThrow(projectId);
    this.ensureCanRead(project, userId);

    const testCase = await TestCase.findOne({
      _id: testCaseId,
      project: projectId,
      deletedAt: null,
    }).lean();

    if (!testCase) {
      throw new NotFoundError("Test case not found");
    }

    const summaryDocs = await TestRunSummary.find({
      testCase: testCaseId,
      project: projectId,
    })
      .select("createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    const summaries = summaryDocs.map((s) => ({
      id: s._id,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return SuccessResponse({
      message: "Test case fetched successfully",
      data: {
        ...testCase,
        summaries,
      },
      httpStatus: StatusCodes.OK,
    });
  }

  async getTestRunSummaryDetail(
    userId: string,
    projectId: string,
    testCaseId: string,
    summaryId: string,
  ) {
    const project = await this.getProjectOrThrow(projectId);
    this.ensureCanRead(project, userId);

    const summary = await TestRunSummary.findOne({
      _id: summaryId,
      project: projectId,
      testCase: testCaseId,
    }).lean();

    if (!summary) {
      throw new NotFoundError("Test run summary not found");
    }

    return SuccessResponse({
      message: "Test run summary fetched successfully",
      data: summary,
      httpStatus: StatusCodes.OK,
    });
  }

  private async getTestCaseOrThrow(projectId: string, testCaseId: string) {
    const testCase = await TestCase.findOne({
      _id: testCaseId,
      project: projectId,
      deletedAt: null,
    });

    if (!testCase) {
      throw new NotFoundError("Test case not found");
    }

    return testCase;
  }

  async createTestCase(userId: string, projectId: string, payload: Record<string, unknown>) {
    const project = await this.getProjectOrThrow(projectId);
    this.ensureCanWrite(project, userId);

    const testCase = await TestCase.create({
      ...payload,
      project: new Types.ObjectId(projectId),
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });

    let queuedJob: ReturnType<typeof mapQueuedJob> | null = null;
    let queueError: string | null = null;

    try {
      const job = await enqueueTestRun({
        testCaseId: testCase._id.toString(),
        projectId,
        triggeredBy: userId,
      });
      queuedJob = mapQueuedJob(job);
      sysLogger.info(
        {
          testCaseId: testCase._id.toString(),
          projectId,
          bullmqJobId: job.id,
          name: testCase.name,
        },
        "Test run enqueued after test case create — run `npm run dev:worker` in another terminal to process",
      );
    } catch (err) {
      queueError = err instanceof Error ? err.message : String(err);
      sysLogger.error(
        {
          err,
          testCaseId: testCase._id.toString(),
          projectId,
        },
        "Could not enqueue test run after create — check REDIS_HOST, REDIS_PORT, and that Redis is running",
      );
    }

    const message =
      queuedJob !== null
        ? "Test case created successfully; load test run queued for the worker"
        : "Test case created successfully, but the test run could not be queued — see queueError (check Redis)";

    return SuccessResponse({
      message,
      data: {
        testCase,
        queuedJob,
        ...(queueError ? { queueError } : {}),
      },
      httpStatus: StatusCodes.CREATED,
    });
  }

  async updateTestCase(
    userId: string,
    projectId: string,
    testCaseId: string,
    payload: TestCasePayload,
  ) {
    const project = await this.getProjectOrThrow(projectId);
    this.ensureCanWrite(project, userId);

    const testCase = await this.getTestCaseOrThrow(projectId, testCaseId);
    const disallowedKeys = ["project", "createdBy", "createdAt", "updatedAt", "deletedAt"];

    for (const [key, value] of Object.entries(payload)) {
      if (disallowedKeys.includes(key) || value === undefined) {
        continue;
      }
      (testCase as unknown as Record<string, unknown>)[key] = value;
    }

    testCase.updatedBy = new Types.ObjectId(userId);
    testCase.latestVersion += 1;

    await testCase.save();

    return SuccessResponse({
      message: "Test case updated successfully",
      data: testCase,
      httpStatus: StatusCodes.OK,
    });
  }

  async deleteTestCase(userId: string, projectId: string, testCaseId: string) {
    const project = await this.getProjectOrThrow(projectId);
    this.ensureCanWrite(project, userId);

    const testCase = await this.getTestCaseOrThrow(projectId, testCaseId);

    if (testCase.deletedAt) {
      throw new BadRequestError("Test case is already deleted");
    }

    testCase.deletedAt = new Date();
    testCase.updatedBy = new Types.ObjectId(userId);
    await testCase.save();

    return SuccessResponse({
      message: "Test case deleted successfully",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }

  async queueTestRun(userId: string, projectId: string, testCaseId: string) {
    const project = await this.getProjectOrThrow(projectId);
    this.ensureCanRead(project, userId);

    const testCase = await this.getTestCaseOrThrow(projectId, testCaseId);
    if (testCase.deletedAt) {
      throw new BadRequestError("Cannot run a deleted test case");
    }

    const manualJobId = `manual:${randomUUID()}`;
    const tcId = testCase._id.toString();

    void executeTestRunAndPersist(tcId, projectId, userId, manualJobId, "inline")
      .then(({ summary, summaryDocId }) => {
        sysLogger.info(
          {
            testCaseId: tcId,
            projectId,
            manualJobId,
            summaryId: summaryDocId.toString(),
            requestsCompleted: summary.requestsCompleted,
            name: testCase.name,
          },
          "Manual test run finished; summary persisted",
        );
      })
      .catch((err: unknown) => {
        sysLogger.error(
          { err, testCaseId: tcId, projectId, manualJobId },
          "Manual inline test run failed — no summary saved for this jobId",
        );
      });

    return SuccessResponse({
      message:
        "Test run started in the background. The HTTP response returns immediately while load testing runs; query TestRunSummary by jobId when finished.",
      data: {
        jobId: manualJobId,
        source: "inline" as const,
        status: "running",
      },
      httpStatus: StatusCodes.ACCEPTED,
    });
  }
}

export default new TestCaseService();

