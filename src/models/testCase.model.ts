import { Document, Schema, Types, model } from "mongoose";

export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  PATCH = "PATCH",
  DELETE = "DELETE",
  HEAD = "HEAD",
  OPTIONS = "OPTIONS",
}

export enum TestCaseStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum TestType {
  LOAD = "LOAD",
  STRESS = "STRESS",
  SPIKE = "SPIKE",
  LATENCY = "LATENCY",
}

export interface ITestRequestConfig {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: string;
  timeoutMs: number;
}

export interface ILoadProfile {
  vus: number;
  durationSeconds: number;
  rampUpSeconds: number;
  rampDownSeconds: number;
}

export interface IStressProfile extends ILoadProfile {
  maxVus: number;
  stepDurationSeconds: number;
}

export interface ISpikeProfile {
  baseVus: number;
  spikeVus: number;
  warmupSeconds: number;
  spikeHoldSeconds: number;
  cooldownSeconds: number;
}

export interface ILatencyPoint {
  percentile: number;
  thresholdMs: number;
}

export interface ILatencyProfile extends ILoadProfile {
  customPoints: ILatencyPoint[];
}

export interface IAssertionRule {
  key: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "regex";
  expected: string | number | boolean;
}

export interface ITestCase extends Document {
  project: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  status: TestCaseStatus;
  testType: TestType;
  request: ITestRequestConfig;
  loadProfile?: ILoadProfile;
  stressProfile?: IStressProfile;
  spikeProfile?: ISpikeProfile;
  latencyProfile?: ILatencyProfile;
  assertions: IAssertionRule[];
  tags: string[];
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  latestVersion: number;
  lastRunAt?: Date | null;
  archivedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const requestConfigSchema = new Schema<ITestRequestConfig>(
  {
    method: {
      type: String,
      enum: Object.values(HttpMethod),
      required: true,
      default: HttpMethod.GET,
    },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    headers: { type: Map, of: String, default: {} },
    query: { type: Map, of: String, default: {} },
    body: { type: String, maxlength: 1_000_000 },
    timeoutMs: { type: Number, min: 100, max: 120000, default: 30000 },
  },
  { _id: false },
);

const loadProfileSchema = new Schema<ILoadProfile>(
  {
    vus: { type: Number, min: 1, max: 100000, default: 1, required: true },
    durationSeconds: {
      type: Number,
      min: 1,
      max: 86400,
      default: 30,
      required: true,
    },
    rampUpSeconds: { type: Number, min: 0, max: 3600, default: 0 },
    rampDownSeconds: { type: Number, min: 0, max: 3600, default: 0 },
  },
  { _id: false },
);

const stressProfileSchema = new Schema<IStressProfile>(
  {
    vus: { type: Number, min: 1, max: 100000, default: 1, required: true },
    maxVus: { type: Number, min: 1, max: 500000, required: true },
    durationSeconds: {
      type: Number,
      min: 1,
      max: 86400,
      default: 30,
      required: true,
    },
    stepDurationSeconds: {
      type: Number,
      min: 1,
      max: 3600,
      default: 30,
      required: true,
    },
    rampUpSeconds: { type: Number, min: 0, max: 3600, default: 0 },
    rampDownSeconds: { type: Number, min: 0, max: 3600, default: 0 },
  },
  { _id: false },
);

const spikeProfileSchema = new Schema<ISpikeProfile>(
  {
    baseVus: { type: Number, min: 1, max: 100000, default: 1, required: true },
    spikeVus: { type: Number, min: 1, max: 500000, required: true },
    warmupSeconds: { type: Number, min: 0, max: 3600, default: 0 },
    spikeHoldSeconds: {
      type: Number,
      min: 1,
      max: 3600,
      default: 30,
      required: true,
    },
    cooldownSeconds: { type: Number, min: 0, max: 3600, default: 0 },
  },
  { _id: false },
);

const latencyPointSchema = new Schema<ILatencyPoint>(
  {
    percentile: { type: Number, min: 0.1, max: 99.99, required: true },
    thresholdMs: { type: Number, min: 1, max: 600000, required: true },
  },
  { _id: false },
);

const latencyProfileSchema = new Schema<ILatencyProfile>(
  {
    vus: { type: Number, min: 1, max: 100000, default: 1, required: true },
    durationSeconds: {
      type: Number,
      min: 1,
      max: 86400,
      default: 30,
      required: true,
    },
    rampUpSeconds: { type: Number, min: 0, max: 3600, default: 0 },
    rampDownSeconds: { type: Number, min: 0, max: 3600, default: 0 },
    customPoints: { type: [latencyPointSchema], default: [] },
  },
  { _id: false },
);

const assertionSchema = new Schema<IAssertionRule>(
  {
    key: { type: String, trim: true, required: true, maxlength: 100 },
    operator: {
      type: String,
      required: true,
      enum: ["eq", "neq", "gt", "gte", "lt", "lte", "contains", "regex"],
    },
    expected: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const testCaseSchema = new Schema<ITestCase>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 2,
      maxlength: 140,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    description: { type: String, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: Object.values(TestCaseStatus),
      default: TestCaseStatus.DRAFT,
      required: true,
    },
    testType: {
      type: String,
      enum: Object.values(TestType),
      default: TestType.LOAD,
      required: true,
      index: true,
    },
    request: { type: requestConfigSchema, required: true },
    loadProfile: { type: loadProfileSchema },
    stressProfile: { type: stressProfileSchema },
    spikeProfile: { type: spikeProfileSchema },
    latencyProfile: { type: latencyProfileSchema },
    assertions: { type: [assertionSchema], default: [] },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 50 }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    latestVersion: { type: Number, min: 1, default: 1, required: true },
    lastRunAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

testCaseSchema.index({ project: 1, slug: 1 }, { unique: true });
testCaseSchema.index({ project: 1, testType: 1, status: 1, updatedAt: -1 });
testCaseSchema.index({ createdBy: 1, createdAt: -1 });
testCaseSchema.index({ deletedAt: 1, archivedAt: 1 });

testCaseSchema.pre("validate", function () {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  const validateRamp = (
    profile: {
      rampUpSeconds: number;
      rampDownSeconds: number;
      durationSeconds: number;
    },
    path: string,
  ) => {
    const totalRamp = profile.rampUpSeconds + profile.rampDownSeconds;
    if (totalRamp > profile.durationSeconds) {
      this.invalidate(
        path,
        "Ramp up + ramp down must not exceed total duration",
      );
    }
  };

  if (this.testType === TestType.LOAD) {
    if (!this.loadProfile) {
      this.invalidate("loadProfile", "loadProfile is required for LOAD tests");
      return;
    }
    validateRamp(this.loadProfile, "loadProfile");
  }

  if (this.testType === TestType.STRESS) {
    if (!this.stressProfile) {
      this.invalidate(
        "stressProfile",
        "stressProfile is required for STRESS tests",
      );
      return;
    }
    validateRamp(this.stressProfile, "stressProfile");
    if (this.stressProfile.maxVus < this.stressProfile.vus) {
      this.invalidate(
        "stressProfile.maxVus",
        "maxVus must be greater than or equal to vus",
      );
    }
  }

  if (this.testType === TestType.SPIKE) {
    if (!this.spikeProfile) {
      this.invalidate(
        "spikeProfile",
        "spikeProfile is required for SPIKE tests",
      );
      return;
    }
    if (this.spikeProfile.spikeVus <= this.spikeProfile.baseVus) {
      this.invalidate(
        "spikeProfile.spikeVus",
        "spikeVus must be greater than baseVus",
      );
    }
  }

  if (this.testType === TestType.LATENCY) {
    if (!this.latencyProfile) {
      this.invalidate(
        "latencyProfile",
        "latencyProfile is required for LATENCY tests",
      );
      return;
    }
    validateRamp(this.latencyProfile, "latencyProfile");

    const points = this.latencyProfile.customPoints ?? [];
    const seenPercentiles = new Set<number>();
    for (const point of points) {
      if (seenPercentiles.has(point.percentile)) {
        this.invalidate(
          "latencyProfile.customPoints",
          "Duplicate latency percentiles are not allowed",
        );
        break;
      }
      seenPercentiles.add(point.percentile);
    }
  }
});

const TestCase = model<ITestCase>("TestCase", testCaseSchema);
export default TestCase;
