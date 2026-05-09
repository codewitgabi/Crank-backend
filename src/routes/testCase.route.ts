import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  createTestCase,
  deleteTestCase,
  runTestCase,
  updateTestCase,
} from "../controllers/testCase.controller";
import {
  CreateTestCaseSchema,
  ProjectAndTestCaseParamSchema,
  UpdateTestCaseSchema,
} from "../validators/testCase.validator";

const router = Router({ mergeParams: true });

router.post("/", authenticate, CreateTestCaseSchema, createTestCase);
router.patch(
  "/:testCaseId",
  authenticate,
  UpdateTestCaseSchema,
  updateTestCase,
);
router.delete(
  "/:testCaseId",
  authenticate,
  ProjectAndTestCaseParamSchema,
  deleteTestCase,
);
router.post(
  "/:testCaseId/run",
  authenticate,
  ProjectAndTestCaseParamSchema,
  runTestCase,
);

export default router;

