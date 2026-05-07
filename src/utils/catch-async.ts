import { NextFunction, Response, Request } from "express";
import sysLogger from "./logger";

const catchAsync =
  <T>(
    controller: (req: Request, res: Response, next: NextFunction) => Promise<T>,
  ) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await controller(req, res, next);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      sysLogger.error(
        { err, path: req.path, method: req.method },
        "Unhandled error in async controller",
      );
      next(error);
    }
  };

export default catchAsync;
