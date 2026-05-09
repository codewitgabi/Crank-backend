import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  createTestCase,
  deleteTestCase,
  listTestCases,
  runTestCase,
  updateTestCase,
} from "../controllers/testCase.controller";
import { ProjectIdParamSchema } from "../validators/project.validator";
import {
  CreateTestCaseSchema,
  ProjectAndTestCaseParamSchema,
  UpdateTestCaseSchema,
} from "../validators/testCase.validator";

const router = Router({ mergeParams: true });

router.get("/", authenticate, ProjectIdParamSchema, listTestCases);
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
