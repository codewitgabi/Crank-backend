import { app } from "./app";
import connectDb from "./config/db.config";
import sysLogger from "./utils/logger";

(() => {
  connectDb()
    .then(() => {
      sysLogger.info("Database connection successful");

      app.listen(app.get("port"), () => {
        sysLogger.info(`Server is running on port ${app.get("port")}`);
      });
    })
    .catch((e) => {
      sysLogger.error(`An error occurred connecting to database: ${e}`);
    });
})();
