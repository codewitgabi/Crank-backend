import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  acceptInvitation,
  cancelInvitation,
  createProject,
  deleteProject,
  getProject,
  inviteMember,
  leaveProject,
  listInvitations,
  listMyPendingInvitations,
  listMembers,
  listProjects,
  removeMember,
  resendInvitation,
  updateProject,
} from "../controllers/project.controller";
import {
  AcceptInvitationSchema,
  CreateProjectSchema,
  InvitationIdParamSchema,
  InviteMemberSchema,
  ListMyInvitationsQuerySchema,
  MemberIdParamSchema,
  ProjectIdParamSchema,
  UpdateProjectSchema,
} from "../validators/project.validator";
import testCaseRoutes from "./testCase.route";

const router = Router();

router.get("/", authenticate, listProjects);
router.get(
  "/invitations",
  authenticate,
  ListMyInvitationsQuerySchema,
  listMyPendingInvitations,
);
router.post("/", authenticate, CreateProjectSchema, createProject);
router.use("/:projectId/test-cases", testCaseRoutes);
router.get("/:projectId", authenticate, ProjectIdParamSchema, getProject);
router.patch("/:projectId", authenticate, UpdateProjectSchema, updateProject);
router.delete("/:projectId", authenticate, ProjectIdParamSchema, deleteProject);
router.post(
  "/:projectId/leave",
  authenticate,
  ProjectIdParamSchema,
  leaveProject,
);

router.get(
  "/:projectId/members",
  authenticate,
  ProjectIdParamSchema,
  listMembers,
);
router.delete(
  "/:projectId/members/:memberId",
  authenticate,
  MemberIdParamSchema,
  removeMember,
);

router.get(
  "/:projectId/invitations",
  authenticate,
  ProjectIdParamSchema,
  listInvitations,
);
router.post(
  "/:projectId/invitations",
  authenticate,
  InviteMemberSchema,
  inviteMember,
);
router.post(
  "/:projectId/invitations/:invitationId/resend",
  authenticate,
  InvitationIdParamSchema,
  resendInvitation,
);
router.delete(
  "/:projectId/invitations/:invitationId",
  authenticate,
  InvitationIdParamSchema,
  cancelInvitation,
);
router.post(
  "/invitations/:token/accept",
  authenticate,
  AcceptInvitationSchema,
  acceptInvitation,
);

export default router;
