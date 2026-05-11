import connectDb from "./config/db.config";
import sysLogger from "./utils/logger";

void (async () => {
  try {
    await connectDb();
    sysLogger.info("Database connected — starting queued test worker");
    await import("./workers/testRun.worker");
  } catch (err) {
    sysLogger.error({ err }, "Worker failed during startup");
    process.exitCode = 1;
  }
})();
