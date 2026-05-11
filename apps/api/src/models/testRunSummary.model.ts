import { Document, Schema, Types, model } from "mongoose";
import { TestType } from "./testCase.model";

export interface ILatencyPercentileResult {
  percentile: number;
  thresholdMs: number;
  actualMs: number;
  ok: boolean;
}

export type TestRunSummarySource = "worker" | "inline";

export interface ITestRunSummary extends Document {
  jobId: string;
  source: TestRunSummarySource;
  triggeredBy: Types.ObjectId;
  project: Types.ObjectId;
  testCase: Types.ObjectId;
  testType: TestType;
  plannedDurationSeconds: number;
  wallClockMs: number;
  requestsCompleted: number;
  networkFailures: number;
  assertionChecks: number;
  assertionPasses: number;
  assertionFailuresByRuleKey: Record<string, number>;
  latencyPercentileChecks?: ILatencyPercentileResult[];
  statusHistogram: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const latencyPercentileSchema = new Schema<ILatencyPercentileResult>(
  {
    percentile: { type: Number, required: true },
    thresholdMs: { type: Number, required: true },
    actualMs: { type: Number, required: true },
    ok: { type: Boolean, required: true },
  },
  { _id: false },
);

const testRunSummarySchema = new Schema<ITestRunSummary>(
  {
    jobId: { type: String, required: true, trim: true, index: true },
    source: {
      type: String,
      enum: ["worker", "inline"],
      required: true,
      default: "worker",
      index: true,
    },
    triggeredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    testCase: {
      type: Schema.Types.ObjectId,
      ref: "TestCase",
      required: true,
      index: true,
    },
    testType: {
      type: String,
      enum: Object.values(TestType),
      required: true,
      index: true,
    },
    plannedDurationSeconds: { type: Number, required: true, min: 0 },
    wallClockMs: { type: Number, required: true, min: 0 },
    requestsCompleted: { type: Number, required: true, min: 0 },
    networkFailures: { type: Number, required: true, min: 0 },
    assertionChecks: { type: Number, required: true, min: 0 },
    assertionPasses: { type: Number, required: true, min: 0 },
    assertionFailuresByRuleKey: {
      type: Schema.Types.Mixed,
      default: {},
    },
    latencyPercentileChecks: {
      type: [latencyPercentileSchema],
      default: [],
    },
    statusHistogram: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
  },
  { timestamps: true },
);

testRunSummarySchema.index({ testCase: 1, createdAt: -1 });
testRunSummarySchema.index({ project: 1, createdAt: -1 });

const TestRunSummary = model<ITestRunSummary>(
  "TestRunSummary",
  testRunSummarySchema,
);
export default TestRunSummary;
