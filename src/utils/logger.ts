import pino, { Logger, LoggerOptions } from "pino";
import { LOG_LEVEL, NODE_ENV, SERVICE_NAME } from "./constants";

const isProduction = NODE_ENV === "production";
const isTest = NODE_ENV === "test";

/** When NODE_ENV=test, Pino would be silent everywhere — except the worker entry script. */
const workerEntryArgv = process.argv[1] ?? "";
const isWorkerEntrypoint =
  /[/\\]worker\.(ts|js)$/i.test(workerEntryArgv.replace(/\\/g, "/"));
const loggingEnabled = !isTest || isWorkerEntrypoint;

/**
 * Paths that should be scrubbed from any log output.
 * Covers common header/body/query field names where secrets may live.
 */
const REDACT_PATHS: string[] = [
  // Request headers
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  'req.headers["x-api-key"]',
  'req.headers["x-auth-token"]',
  "headers.authorization",
  "headers.cookie",
  'headers["set-cookie"]',
  'headers["x-api-key"]',

  // Top-level credentials in any payload object
  "*.password",
  "*.passwordConfirmation",
  "*.confirmPassword",
  "*.currentPassword",
  "*.newPassword",
  "*.token",
  "*.accessToken",
  "*.refreshToken",
  "*.apiKey",
  "*.secret",
  "*.authorization",

  // Direct fields (when the logged object IS the credential bag)
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "secret",
  "authorization",
];

const baseOptions: LoggerOptions = {
  name: SERVICE_NAME,
  level: LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  enabled: loggingEnabled,
  base: {
    service: SERVICE_NAME,
    env: NODE_ENV,
    pid: process.pid,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
    remove: false,
  },
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
};

const sysLogger: Logger = pino({
  ...baseOptions,
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l",
          ignore: "pid,hostname,service,env",
          singleLine: false,
        },
      },
});

/**
 * Create a child logger that inherits configuration but adds permanent
 * bindings (e.g. requestId, userId, module name) to every log line.
 */
export const createLogger = (bindings: Record<string, unknown>): Logger =>
  sysLogger.child(bindings);

/** Best-effort flush (important with pino-pretty transport so job logs appear before the next job). */
export const flushLogs = (): Promise<void> =>
  new Promise((resolve) => {
    try {
      if (typeof sysLogger.flush === "function") {
        sysLogger.flush(() => resolve());
        return;
      }
    } catch {
      // ignore
    }
    resolve();
  });

/**
 * Best-effort flush of buffered logs before exiting on a fatal signal.
 * Pino's async transports buffer in a worker thread, so we give it a moment.
 */
const flushAndExit = (code: number): void => {
  const finalize = () => process.exit(code);
  try {
    sysLogger.flush?.();
  } catch {
    // ignore
  }
  setTimeout(finalize, 200).unref();
};

process.on("uncaughtException", (err: Error) => {
  sysLogger.fatal({ err }, "uncaughtException - shutting down");
  flushAndExit(1);
});

process.on("unhandledRejection", (reason: unknown) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  sysLogger.fatal({ err }, "unhandledRejection - shutting down");
  flushAndExit(1);
});

export default sysLogger;
