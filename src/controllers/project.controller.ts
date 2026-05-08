import { Request, Response } from "express";
import catchAsync from "../utils/catch-async";
import projectService from "../services/project.service";
import { getAuthenticatedUser, getRouteParam } from "../utils/request-helpers";
import { InvitationStatus } from "../models/projectInvitation.model";

export const createProject = catchAsync(async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const response = await projectService.createProject(user.userId, req.body);
  return res.status(response.httpStatus).json(response);
});

export const listProjects = catchAsync(async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const response = await projectService.listProjects(user.userId);
  return res.status(response.httpStatus).json(response);
});

export const getProject = catchAsync(async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const response = await projectService.getProjectById(
    user.userId,
    getRouteParam(req.params.projectId, "projectId"),
  );
  return res.status(response.httpStatus).json(response);
});

export const updateProject = catchAsync(async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const response = await projectService.updateProject(
    user.userId,
    getRouteParam(req.params.projectId, "projectId"),
    req.body,
  );
  return res.status(response.httpStatus).json(response);
});

export const deleteProject = catchAsync(async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const response = await projectService.deleteProject(
    user.userId,
    getRouteParam(req.params.projectId, "projectId"),
  );
  return res.status(response.httpStatus).json(response);
});

export const listMembers = catchAsync(async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const response = await projectService.listMembers(
    user.userId,
    getRouteParam(req.params.projectId, "projectId"),
  );
  return res.status(response.httpStatus).json(response);
});

export const removeMember = catchAsync(async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const response = await projectService.removeMember(
    user.userId,
    getRouteParam(req.params.projectId, "projectId"),
    getRouteParam(req.params.memberId, "memberId"),
  );
  return res.status(response.httpStatus).json(response);
});

export const leaveProject = catchAsync(async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const response = await projectService.leaveProject(
    user.userId,
    getRouteParam(req.params.projectId, "projectId"),
  );
  return res.status(response.httpStatus).json(response);
});

export const inviteMember = catchAsync(async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const response = await projectService.inviteMember(
    user.userId,
    getRouteParam(req.params.projectId, "projectId"),
    req.body,
  );
  return res.status(response.httpStatus).json(response);
});

export const listInvitations = catchAsync(
  async (req: Request, res: Response) => {
    const user = getAuthenticatedUser(req);
    const response = await projectService.listInvitations(
      user.userId,
      getRouteParam(req.params.projectId, "projectId"),
    );
    return res.status(response.httpStatus).json(response);
  },
);

export const resendInvitation = catchAsync(
  async (req: Request, res: Response) => {
    const user = getAuthenticatedUser(req);
    const response = await projectService.resendInvitation(
      user.userId,
      getRouteParam(req.params.projectId, "projectId"),
      getRouteParam(req.params.invitationId, "invitationId"),
    );
    return res.status(response.httpStatus).json(response);
  },
);

export const cancelInvitation = catchAsync(
  async (req: Request, res: Response) => {
    const user = getAuthenticatedUser(req);
    const response = await projectService.cancelInvitation(
      user.userId,
      getRouteParam(req.params.projectId, "projectId"),
      getRouteParam(req.params.invitationId, "invitationId"),
    );
    return res.status(response.httpStatus).json(response);
  },
);

export const acceptInvitation = catchAsync(
  async (req: Request, res: Response) => {
    const user = getAuthenticatedUser(req);
    const response = await projectService.acceptInvitation(
      user.userId,
      user.email,
      getRouteParam(req.params.token, "token"),
    );
    return res.status(response.httpStatus).json(response);
  },
);

export const listMyPendingInvitations = catchAsync(
  async (req: Request, res: Response) => {
    const user = getAuthenticatedUser(req);
    const statusQuery = req.query.status;
    const statusRaw = Array.isArray(statusQuery) ? statusQuery[0] : statusQuery;
    const normalizedStatus =
      typeof statusRaw === "string" ? statusRaw.toUpperCase() : undefined;
    const status =
      (normalizedStatus as InvitationStatus | undefined) ??
      InvitationStatus.PENDING;

    const response = await projectService.listMyInvitations(user.email, status);
    return res.status(response.httpStatus).json(response);
  },
);
