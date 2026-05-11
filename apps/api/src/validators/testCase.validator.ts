import { body, param } from "express-validator";
import { HttpMethod, TestCaseStatus, TestType } from "../models/testCase.model";
import { validateRequest } from "../middlewares/validation.middleware";

const commonPayloadValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage("Name must be between 2 and 120 characters"),
  body("slug")
    .optional()
    .trim()
    .isLength({ min: 2, max: 140 })
    .withMessage("Slug must be between 2 and 140 characters")
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage(
      "Slug can only contain lowercase letters, numbers, and hyphens",
    ),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),
  body("status")
    .optional()
    .isIn(Object.values(TestCaseStatus))
    .withMessage("Invalid test case status"),
  body("testType")
    .optional()
    .isIn(Object.values(TestType))
    .withMessage("Invalid test type"),
  body("request")
    .optional()
    .isObject()
    .withMessage("Request must be an object"),
  body("request.method")
    .optional()
    .isIn(Object.values(HttpMethod))
    .withMessage("Invalid request method"),
  body("request.url")
    .optional()
    .trim()
    .isURL({ require_tld: false })
    .withMessage("Request URL must be a valid URL"),
  body("request.timeoutMs")
    .optional()
    .isInt({ min: 100, max: 120000 })
    .withMessage("Timeout must be between 100 and 120000 milliseconds"),
  body("tags")
    .optional()
    .isArray({ max: 30 })
    .withMessage("Tags must be an array with at most 30 entries"),
  body("tags.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each tag must be between 1 and 50 characters"),
];

export const ProjectAndTestCaseParamSchema = [
  param("projectId").isMongoId().withMessage("Invalid project id"),
  param("testCaseId").isMongoId().withMessage("Invalid test case id"),
  validateRequest,
];

export const TestRunSummaryDetailParamSchema = [
  param("projectId").isMongoId().withMessage("Invalid project id"),
  param("testCaseId").isMongoId().withMessage("Invalid test case id"),
  param("summaryId").isMongoId().withMessage("Invalid summary id"),
  validateRequest,
];

export const CreateTestCaseSchema = [
  param("projectId").isMongoId().withMessage("Invalid project id"),
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 120 })
    .withMessage("Name must be between 2 and 120 characters"),
  body("testType")
    .notEmpty()
    .withMessage("Test type is required")
    .isIn(Object.values(TestType))
    .withMessage("Invalid test type"),
  body("request").isObject().withMessage("Request is required"),
  body("request.method")
    .notEmpty()
    .withMessage("Request method is required")
    .isIn(Object.values(HttpMethod))
    .withMessage("Invalid request method"),
  body("request.url")
    .notEmpty()
    .withMessage("Request URL is required")
    .isURL({ require_tld: false })
    .withMessage("Request URL must be a valid URL"),
  body("request.timeoutMs")
    .optional()
    .isInt({ min: 100, max: 120000 })
    .withMessage("Timeout must be between 100 and 120000 milliseconds"),
  ...commonPayloadValidation,
  validateRequest,
];

export const UpdateTestCaseSchema = [
  param("projectId").isMongoId().withMessage("Invalid project id"),
  param("testCaseId").isMongoId().withMessage("Invalid test case id"),
  ...commonPayloadValidation,
  validateRequest,
];
