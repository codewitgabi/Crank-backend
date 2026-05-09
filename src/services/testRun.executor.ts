import {
  HttpMethod,
  IAssertionRule,
  ILatencyProfile,
  ILoadProfile,
  ISpikeProfile,
  IStressProfile,
  ITestRequestConfig,
  TestType,
} from "../models/testCase.model";
import { createLogger } from "../utils/logger";

const log = createLogger({ component: "testRun.executor" });

const SCHEDULER_TICK_MS = 250;
const BODY_READ_MAX_CHARS = 100_000;

type HeadersQuery = Map<string, string> | Record<string, string> | undefined;

export type LeanTestCaseForRun = {
  _id: { toString(): string };
  testType: TestType;
  request: Omit<ITestRequestConfig, "headers" | "query"> & {
    headers?: HeadersQuery;
    query?: HeadersQuery;
  };
  loadProfile?: ILoadProfile | null;
  stressProfile?: IStressProfile | null;
  spikeProfile?: ISpikeProfile | null;
  latencyProfile?: ILatencyProfile | null;
  assertions?: IAssertionRule[] | null;
};

function mapKv(input: HeadersQuery): Record<string, string> {
  if (!input || typeof input !== "object") {
    return {};
  }
  if (input instanceof Map) {
    return Object.fromEntries(input.entries()) as Record<string, string>;
  }
  return { ...input };
}

export function buildRequestUrl(url: string, query?: HeadersQuery): string {
  const u = new URL(url);
  for (const [k, v] of Object.entries(mapKv(query))) {
    u.searchParams.set(k, String(v));
  }
  return u.href;
}

type ShotResult = {
  statusCode: number;
  latencyMs: number;
  bodySnippet: string | null;
};

function assertionNeedsBodySnapshot(key: string): boolean {
  return key === "body" || key === "responseBody" || key.startsWith("body.");
}

async function executeOneRequest(
  cfg: LeanTestCaseForRun["request"],
  readFullBodyForAssertions: boolean,
): Promise<ShotResult> {
  const rawUrl = buildRequestUrl(cfg.url, cfg.query);
  const method = cfg.method.toUpperCase() as HttpMethod;
  const headers = mapKv(cfg.headers);
  const hasBody =
    cfg.body !== undefined &&
    cfg.body !== null &&
    cfg.body !== "" &&
    method !== HttpMethod.GET &&
    method !== HttpMethod.HEAD;

  const headersInit = new Headers(headers);
  const t0 = performance.now();

  try {
    const res = await fetch(rawUrl, {
      method,
      headers: headersInit,
      body: hasBody ? cfg.body : undefined,
      signal: AbortSignal.timeout(Math.max(cfg.timeoutMs ?? 30_000, 100)),
    });

    if (method === HttpMethod.HEAD) {
      return {
        statusCode: res.status,
        latencyMs: Math.round(performance.now() - t0),
        bodySnippet: null,
      };
    }

    const text = await res.text().catch(() => "");
    let bodySnippet: string | null = null;
    if (readFullBodyForAssertions && text) {
      bodySnippet =
        text.length <= BODY_READ_MAX_CHARS
          ? text
          : text.slice(0, BODY_READ_MAX_CHARS);
    }

    return {
      statusCode: res.status,
      latencyMs: Math.round(performance.now() - t0),
      bodySnippet: readFullBodyForAssertions ? bodySnippet : null,
    };
  } catch (err) {
    log.debug({ err, url: rawUrl }, "Request failed");
    return {
      statusCode: 0,
      latencyMs: Math.round(performance.now() - t0),
      bodySnippet: null,
    };
  }
}

function coerceNumber(v: unknown): number | null {
  if (typeof v === "number" && !Number.isNaN(v)) {
    return v;
  }
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function pickAssertionValue(row: ShotResult, key: string): unknown {
  if (key === "statusCode") {
    return row.statusCode;
  }
  if (key === "latencyMs") {
    return row.latencyMs;
  }
  if (
    row.bodySnippet !== null &&
    (key === "body" || key === "responseBody" || key.startsWith("body."))
  ) {
    try {
      if (key === "body" || key === "responseBody") {
        return row.bodySnippet;
      }
      const tail = key.slice("body.".length);
      const data = JSON.parse(row.bodySnippet) as unknown;
      if (typeof data === "object" && data && tail in (data as object)) {
        return (data as Record<string, unknown>)[tail];
      }
      return undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function equalsRule(actual: unknown, expected: unknown): boolean {
  const aNum = coerceNumber(actual);
  const eNum = coerceNumber(expected);
  if (aNum !== null && eNum !== null) {
    return aNum === eNum;
  }
  return String(actual) === String(expected);
}

function evaluateAssertion(rule: IAssertionRule, row: ShotResult): boolean {
  const actual = pickAssertionValue(row, rule.key);

  switch (rule.operator) {
    case "eq":
      return equalsRule(actual, rule.expected);

    case "neq":
      return !equalsRule(actual, rule.expected);

    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const aNum = coerceNumber(actual);
      const eNum = coerceNumber(rule.expected);
      if (aNum === null || eNum === null) {
        return false;
      }
      if (rule.operator === "gt") {
        return aNum > eNum;
      }
      if (rule.operator === "gte") {
        return aNum >= eNum;
      }
      if (rule.operator === "lt") {
        return aNum < eNum;
      }
      return aNum <= eNum;
    }

    case "contains": {
      const s =
        typeof actual === "string" ? actual : (String(actual ?? "") ?? "");
      return s.includes(String(rule.expected));
    }

    case "regex": {
      try {
        const rx = new RegExp(String(rule.expected));
        const s =
          typeof actual === "string" ? actual : (String(actual ?? "") ?? "");
        return rx.test(s);
      } catch {
        return false;
      }
    }

    default:
      return false;
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))] ?? 0;
}

export function summarizeLatencyAgainstThresholds(
  samples: number[],
  profile: ILatencyProfile,
): Array<{
  percentile: number;
  thresholdMs: number;
  actualMs: number;
  ok: boolean;
}> {
  const sorted = samples.length === 0 ? [] : [...samples].sort((a, b) => a - b);
  return (profile.customPoints ?? []).map((point) => {
    const actual = percentile(sorted, point.percentile);
    return {
      percentile: point.percentile,
      thresholdMs: point.thresholdMs,
      actualMs: actual,
      ok: samples.length === 0 ? false : actual <= point.thresholdMs,
    };
  });
}

interface VuController {
  stop: boolean;
}

function computeLoadTargetVUs(elapsedSec: number, p: ILoadProfile): number {
  const { vus, durationSeconds, rampUpSeconds, rampDownSeconds } = p;
  if (elapsedSec >= durationSeconds) {
    return 0;
  }
  if (elapsedSec < rampUpSeconds) {
    return rampUpSeconds > 0
      ? Math.max(1, Math.round((elapsedSec / rampUpSeconds) * vus))
      : vus;
  }
  if (elapsedSec >= durationSeconds - rampDownSeconds && rampDownSeconds > 0) {
    const t = elapsedSec - (durationSeconds - rampDownSeconds);
    return Math.max(
      0,
      Math.round(((rampDownSeconds - t) / rampDownSeconds) * vus),
    );
  }
  return vus;
}

function computeStressTargetVUs(elapsedSec: number, p: IStressProfile): number {
  const { vus, maxVus, durationSeconds, stepDurationSeconds } = p;
  if (elapsedSec >= durationSeconds) {
    return 0;
  }
  const steps = Math.max(1, Math.ceil(durationSeconds / stepDurationSeconds));
  const idx = Math.min(Math.floor(elapsedSec / stepDurationSeconds), steps - 1);
  if (steps === 1) {
    return vus;
  }
  const frac = idx / (steps - 1);
  return Math.round(vus + frac * (maxVus - vus));
}

function computeSpikeTargetVUs(elapsedSec: number, p: ISpikeProfile): number {
  const totalDur = p.warmupSeconds + p.spikeHoldSeconds + p.cooldownSeconds;
  if (elapsedSec >= totalDur) {
    return 0;
  }
  if (elapsedSec < p.warmupSeconds) {
    return p.baseVus;
  }
  if (elapsedSec < p.warmupSeconds + p.spikeHoldSeconds) {
    return p.spikeVus;
  }
  return p.baseVus;
}

type Schedule = {
  durationSeconds: number;
  pick: (elapsedSec: number) => number;
};

function resolveSchedule(tc: LeanTestCaseForRun): Schedule {
  switch (tc.testType) {
    case TestType.LOAD:
      if (!tc.loadProfile) {
        throw new Error("LOAD test requires loadProfile");
      }
      return {
        durationSeconds: tc.loadProfile.durationSeconds,
        pick: (t) => computeLoadTargetVUs(t, tc.loadProfile!),
      };
    case TestType.LATENCY:
      if (!tc.latencyProfile) {
        throw new Error("LATENCY test requires latencyProfile");
      }
      return {
        durationSeconds: tc.latencyProfile.durationSeconds,
        pick: (t) => computeLoadTargetVUs(t, tc.latencyProfile!),
      };
    case TestType.STRESS:
      if (!tc.stressProfile) {
        throw new Error("STRESS test requires stressProfile");
      }
      return {
        durationSeconds: tc.stressProfile.durationSeconds,
        pick: (t) => computeStressTargetVUs(t, tc.stressProfile!),
      };
    case TestType.SPIKE:
      if (!tc.spikeProfile) {
        throw new Error("SPIKE test requires spikeProfile");
      }
      return {
        durationSeconds: Math.max(
          1,
          tc.spikeProfile.warmupSeconds +
            tc.spikeProfile.spikeHoldSeconds +
            tc.spikeProfile.cooldownSeconds,
        ),
        pick: (t) => computeSpikeTargetVUs(t, tc.spikeProfile!),
      };
    default:
      throw new Error("Unsupported test type");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface RunExecutionSummary {
  testCaseId: string;
  testType: TestType;
  plannedDurationSeconds: number;
  wallClockMs: number;
  requestsCompleted: number;
  networkFailures: number;
  assertionChecks: number;
  assertionPasses: number;
  assertionFailuresByRuleKey: Record<string, number>;
  latencyPercentileChecks?: Array<{
    percentile: number;
    thresholdMs: number;
    actualMs: number;
    ok: boolean;
  }>;
  statusHistogram: Record<string, number>;
}

export async function runLoadTestAgainstCase(
  tc: LeanTestCaseForRun,
): Promise<RunExecutionSummary> {
  const assertions = tc.assertions ?? [];
  const needsBodyAssertion = assertions.some((a) =>
    assertionNeedsBodySnapshot(a.key),
  );

  const schedule = resolveSchedule(tc);
  log.info(
    {
      testCaseId: tc._id.toString(),
      testType: tc.testType,
      durationSeconds: schedule.durationSeconds,
    },
    "Load test executor starting — sending HTTP traffic per test case request/profile",
  );

  const startMs = Date.now();
  const deadlineMs = startMs + schedule.durationSeconds * 1000;

  const vuControllers: VuController[] = [];
  const vuPromises: Promise<void>[] = [];

  let requestsCompleted = 0;
  let networkFailures = 0;
  let assertionChecks = 0;
  let assertionPasses = 0;
  const assertionFailuresByRuleKey: Record<string, number> = {};
  const statusHistogram: Record<string, number> = {};
  const latenciesMs: number[] = [];

  const vuLoop = (ctl: VuController) => async () => {
    while (!ctl.stop && Date.now() < deadlineMs) {
      const shot = await executeOneRequest(tc.request, needsBodyAssertion);
      requestsCompleted++;
      const codeKey =
        shot.statusCode === 0 ? "NETWORK_ERROR" : String(shot.statusCode);
      statusHistogram[codeKey] = (statusHistogram[codeKey] ?? 0) + 1;

      if (shot.statusCode === 0) {
        networkFailures++;
      } else if (shot.statusCode > 0 && shot.statusCode < 600) {
        latenciesMs.push(shot.latencyMs);
      }

      if (assertions.length > 0) {
        const treatAsUnreachable = shot.statusCode === 0;
        for (const rule of assertions) {
          assertionChecks++;
          const ok =
            treatAsUnreachable &&
            rule.key !== "statusCode" &&
            rule.key !== "latencyMs"
              ? false
              : evaluateAssertion(rule, shot);
          if (ok) {
            assertionPasses++;
          } else {
            assertionFailuresByRuleKey[rule.key] =
              (assertionFailuresByRuleKey[rule.key] ?? 0) + 1;
          }
        }
      }
    }
  };

  try {
    while (Date.now() < deadlineMs) {
      const elapsedSec = Math.max(0, (Date.now() - startMs) / 1000);
      const target = Math.max(0, Math.round(schedule.pick(elapsedSec)));

      while (vuControllers.length < target) {
        const ctl: VuController = { stop: false };
        vuControllers.push(ctl);
        vuPromises.push(vuLoop(ctl)());
      }

      while (vuControllers.length > target) {
        const ctl = vuControllers.pop();
        if (ctl) {
          ctl.stop = true;
        }
      }

      await sleep(SCHEDULER_TICK_MS);
    }
  } finally {
    vuControllers.forEach((c) => {
      c.stop = true;
    });
    await Promise.all(vuPromises);
  }

  log.info(
    {
      testCaseId: tc._id.toString(),
      requestsCompleted,
      networkFailures,
      durationSeconds: schedule.durationSeconds,
    },
    "Load test executor finished",
  );

  const wallClockMs = Date.now() - startMs;

  let latencyPercentileChecks: RunExecutionSummary["latencyPercentileChecks"];

  if (tc.testType === TestType.LATENCY && tc.latencyProfile) {
    latencyPercentileChecks = summarizeLatencyAgainstThresholds(
      latenciesMs,
      tc.latencyProfile,
    );
  }

  return {
    testCaseId: tc._id.toString(),
    testType: tc.testType,
    plannedDurationSeconds: schedule.durationSeconds,
    wallClockMs,
    requestsCompleted,
    networkFailures,
    assertionChecks,
    assertionPasses,
    assertionFailuresByRuleKey,
    latencyPercentileChecks,
    statusHistogram,
  };
}
