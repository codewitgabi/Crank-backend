import { body, param, query } from "express-validator";
import { ProjectRole, ProjectVisibility } from "../models/project.model";
import { validateRequest } from "../middlewares/validation.middleware";
import { InvitationStatus } from "../models/projectInvitation.model";

export const CreateProjectSchema = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Project name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Project name must be between 2 and 100 characters"),
  body("slug")
    .optional()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage("Slug must be between 2 and 120 characters")
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage("Slug can only contain letters, numbers, and hyphens"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),
  body("visibility")
    .optional()
    .isIn(Object.values(ProjectVisibility))
    .withMessage("Visibility must be PRIVATE or INTERNAL"),
  body("repositoryUrl")
    .optional()
    .trim()
    .isURL()
    .withMessage("Repository URL must be a valid URL"),
  body("defaultBranch")
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage("Default branch must be between 1 and 120 characters"),
  body("tags")
    .optional()
    .isArray({ max: 30 })
    .withMessage("Tags must be an array with at most 30 entries"),
  body("tags.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each tag must be between 1 and 50 characters"),
  validateRequest,
];

export const ProjectIdParamSchema = [
  param("projectId").isMongoId().withMessage("Invalid project id"),
  validateRequest,
];

export const MemberIdParamSchema = [
  param("projectId").isMongoId().withMessage("Invalid project id"),
  param("memberId").isMongoId().withMessage("Invalid member id"),
  validateRequest,
];

export const UpdateProjectSchema = [
  param("projectId").isMongoId().withMessage("Invalid project id"),
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Project name must be between 2 and 100 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),
  body("visibility")
    .optional()
    .isIn(Object.values(ProjectVisibility))
    .withMessage("Visibility must be PRIVATE or INTERNAL"),
  body("repositoryUrl")
    .optional()
    .trim()
    .isURL()
    .withMessage("Repository URL must be a valid URL"),
  body("defaultBranch")
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage("Default branch must be between 1 and 120 characters"),
  body("tags")
    .optional()
    .isArray({ max: 30 })
    .withMessage("Tags must be an array with at most 30 entries"),
  body("tags.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each tag must be between 1 and 50 characters"),
  validateRequest,
];

export const InviteMemberSchema = [
  param("projectId").isMongoId().withMessage("Invalid project id"),
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .toLowerCase(),
  body("role")
    .optional()
    .isIn([ProjectRole.ADMIN, ProjectRole.MEMBER, ProjectRole.VIEWER])
    .withMessage("Role must be ADMIN, MEMBER, or VIEWER"),
  validateRequest,
];

export const InvitationIdParamSchema = [
  param("projectId").isMongoId().withMessage("Invalid project id"),
  param("invitationId").isMongoId().withMessage("Invalid invitation id"),
  validateRequest,
];

export const AcceptInvitationSchema = [
  param("token")
    .isString()
    .isLength({ min: 20 })
    .withMessage("Invalid invitation token"),
  validateRequest,
];

export const ListMyInvitationsQuerySchema = [
  query("status")
    .optional()
    .isIn(Object.values(InvitationStatus))
    .withMessage("Status must be PENDING, ACCEPTED, CANCELLED, or EXPIRED"),
  validateRequest,
];
