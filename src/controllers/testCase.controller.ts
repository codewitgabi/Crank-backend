import { Request, Response } from "express";
import catchAsync from "../utils/catch-async";
import { getAuthenticatedUser, getRouteParam } from "../utils/request-helpers";
import testCaseService from "../services/testCase.service";

export const createTestCase = catchAsync(
  async (req: Request, res: Response) => {
    const user = getAuthenticatedUser(req);
    const response = await testCaseService.createTestCase(
      user.userId,
      getRouteParam(req.params.projectId, "projectId"),
      req.body,
    );
    return res.status(response.httpStatus).json(response);
  },
);

export const updateTestCase = catchAsync(
  async (req: Request, res: Response) => {
    const user = getAuthenticatedUser(req);
    const response = await testCaseService.updateTestCase(
      user.userId,
      getRouteParam(req.params.projectId, "projectId"),
      getRouteParam(req.params.testCaseId, "testCaseId"),
      req.body,
    );
    return res.status(response.httpStatus).json(response);
  },
);

export const deleteTestCase = catchAsync(
  async (req: Request, res: Response) => {
    const user = getAuthenticatedUser(req);
    const response = await testCaseService.deleteTestCase(
      user.userId,
      getRouteParam(req.params.projectId, "projectId"),
      getRouteParam(req.params.testCaseId, "testCaseId"),
    );
    return res.status(response.httpStatus).json(response);
  },
);

export const runTestCase = catchAsync(async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const response = await testCaseService.queueTestRun(
    user.userId,
    getRouteParam(req.params.projectId, "projectId"),
    getRouteParam(req.params.testCaseId, "testCaseId"),
  );
  return res.status(response.httpStatus).json(response);
});
