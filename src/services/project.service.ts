import crypto from "crypto";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import Project, {
  IProject,
  ProjectRole,
  ProjectVisibility,
} from "../models/project.model";
import ProjectInvitation, {
  InvitationStatus,
} from "../models/projectInvitation.model";
import User from "../models/user.model";
import transporter from "../config/mail.config";
import { FRONTEND_URL } from "../utils/constants";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/api.errors";
import { SuccessResponse } from "../utils/response";

type ProjectUpdatePayload = Partial<{
  name: string;
  description: string;
  visibility: ProjectVisibility;
  repositoryUrl: string;
  defaultBranch: string;
  tags: string[];
}>;

class ProjectService {
  private inviteExpiryMs = 7 * 24 * 60 * 60 * 1000;

  private toProjectResponse(project: IProject) {
    return {
      id: project._id,
      name: project.name,
      slug: project.slug,
      description: project.description ?? null,
      owner: project.owner,
      visibility: project.visibility,
      repositoryUrl: project.repositoryUrl ?? null,
      defaultBranch: project.defaultBranch ?? null,
      tags: project.tags,
      members: project.members,
      metadata: project.metadata,
      archivedAt: project.archivedAt ?? null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  private toProjectListItem(project: { _id: unknown; name: string; slug: string }) {
    return {
      id: project._id,
      name: project.name,
      slug: project.slug,
    };
  }

  private getProjectRole(
    project: IProject,
    userId: string,
  ): ProjectRole | null {
    const member = project.members.find((m) => m.user.toString() === userId);
    return member?.role ?? null;
  }

  private ensureCanRead(project: IProject, userId: string) {
    const role = this.getProjectRole(project, userId);
    if (!role) {
      throw new ForbiddenError("You do not have access to this project");
    }
  }

  private ensureCanAdmin(project: IProject, userId: string) {
    const role = this.getProjectRole(project, userId);
    if (!role || (role !== ProjectRole.OWNER && role !== ProjectRole.ADMIN)) {
      throw new ForbiddenError("Only owner/admin can perform this action");
    }
  }

  private ensureOwner(project: IProject, userId: string) {
    if (project.owner.toString() !== userId) {
      throw new ForbiddenError("Only project owner can perform this action");
    }
  }

  private buildSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private async getProjectOrThrow(projectId: string): Promise<IProject> {
    const project = await Project.findOne({
      _id: projectId,
      deletedAt: null,
    });
    if (!project) {
      throw new NotFoundError("Project not found");
    }
    return project;
  }

  async createProject(
    userId: string,
    payload: {
      name: string;
      slug?: string;
      description?: string;
      visibility?: ProjectVisibility;
      repositoryUrl?: string;
      defaultBranch?: string;
      tags?: string[];
    },
  ) {
    const slug = payload.slug
      ? this.buildSlug(payload.slug)
      : this.buildSlug(payload.name);

    const exists = await Project.findOne({
      owner: userId,
      slug,
    });
    if (exists && !exists.deletedAt) {
      throw new BadRequestError("You already have a project with this name");
    }
    if (exists && exists.deletedAt) {
      throw new BadRequestError(
        "A deleted project with this name already exists. Use a different name, or restore that project first.",
      );
    }

    let project: IProject;
    try {
      project = await Project.create({
        name: payload.name,
        slug,
        description: payload.description,
        owner: userId,
        visibility: payload.visibility ?? ProjectVisibility.PRIVATE,
        repositoryUrl: payload.repositoryUrl,
        defaultBranch: payload.defaultBranch ?? "main",
        tags: payload.tags ?? [],
        members: [
          { user: userId, role: ProjectRole.OWNER, joinedAt: new Date() },
        ],
        metadata: { environmentCount: 0, testCaseCount: 0 },
        deletedAt: null,
        archivedAt: null,
      });
    } catch (error: unknown) {
      const isDuplicateSlug =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: number }).code === 11000;

      if (isDuplicateSlug) {
        throw new BadRequestError(
          "A project with this name already exists (including deleted projects). Please choose a different name.",
        );
      }
      throw error;
    }

    return SuccessResponse({
      message: "Project created successfully",
      data: this.toProjectResponse(project),
      httpStatus: StatusCodes.CREATED,
    });
  }

  async listProjects(userId: string) {
    const projects = await Project.find({
      deletedAt: null,
      "members.user": userId,
    })
      .select("_id name slug")
      .sort({ updatedAt: -1 })
      .lean();

    return SuccessResponse({
      message: "Projects fetched successfully",
      data: projects.map((project) => this.toProjectListItem(project)),
      httpStatus: StatusCodes.OK,
    });
  }

  async getProjectById(userId: string, projectId: string) {
    const project = await this.getProjectOrThrow(projectId);
    this.ensureCanRead(project, userId);

    return SuccessResponse({
      message: "Project fetched successfully",
      data: this.toProjectResponse(project),
      httpStatus: StatusCodes.OK,
    });
  }

  async updateProject(
    userId: string,
    projectId: string,
    payload: ProjectUpdatePayload,
  ) {
    const project = await this.getProjectOrThrow(projectId);
    this.ensureCanAdmin(project, userId);

    const allowed: Array<keyof ProjectUpdatePayload> = [
      "name",
      "description",
      "visibility",
      "repositoryUrl",
      "defaultBranch",
      "tags",
    ];

    const updates = Object.fromEntries(
      Object.entries(payload).filter(
        ([key, value]) =>
          allowed.includes(key as keyof ProjectUpdatePayload) &&
          value !== undefined,
      ),
    ) as ProjectUpdatePayload;

    if (updates.name) {
      project.name = updates.name;
    }
    if (updates.description !== undefined) {
      project.description = updates.description;
    }
    if (updates.visibility) {
      project.visibility = updates.visibility;
    }
    if (updates.repositoryUrl !== undefined) {
      project.repositoryUrl = updates.repositoryUrl;
    }
    if (updates.defaultBranch !== undefined) {
      project.defaultBranch = updates.defaultBranch;
    }
    if (updates.tags) {
      project.tags = updates.tags;
    }
    project.metadata.lastActivityAt = new Date();
    await project.save();

    return SuccessResponse({
      message: "Project updated successfully",
      data: this.toProjectResponse(project),
      httpStatus: StatusCodes.OK,
    });
  }

  async deleteProject(userId: string, projectId: string) {
    const project = await this.getProjectOrThrow(projectId);
    this.ensureOwner(project, userId);

    project.deletedAt = new Date();
    await project.save();

    await ProjectInvitation.updateMany(
      { project: project._id, status: InvitationStatus.PENDING },
      { status: InvitationStatus.CANCELLED, cancelledAt: new Date() },
    );

    return SuccessResponse({
      message: "Project deleted successfully",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }

  async restoreProject(userId: string, projectId: string) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    this.ensureOwner(project, userId);

    if (!project.deletedAt) {
      throw new BadRequestError("Project is already active");
    }

    project.deletedAt = null;
    project.metadata.lastActivityAt = new Date();
    await project.save();

    return SuccessResponse({
      message: "Project restored successfully",
      data: this.toProjectResponse(project),
      httpStatus: StatusCodes.OK,
    });
  }

  async listMembers(userId: string, projectId: string) {
    const project = await this.getProjectOrThrow(projectId);
    this.ensureCanRead(project, userId);

    return SuccessResponse({
      message: "Project members fetched successfully",
      data: project.members,
      httpStatus: StatusCodes.OK,
    });
  }

  async removeMember(userId: string, projectId: string, memberId: string) {
    const project = await this.getProjectOrThrow(projectId);
    this.ensureCanAdmin(project, userId);

    if (project.owner.toString() === memberId) {
      throw new BadRequestError("Project owner cannot be removed");
    }

    const before = project.members.length;
    project.members = project.members.filter(
      (member) => member.user.toString() !== memberId,
    );
    if (before === project.members.length) {
      throw new NotFoundError("Member not found");
    }

    await project.save();

    return SuccessResponse({
      message: "Member removed successfully",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }

  async leaveProject(userId: string, projectId: string) {
    const project = await this.getProjectOrThrow(projectId);
    if (project.owner.toString() === userId) {
      throw new BadRequestError("Project owner cannot leave the project");
    }

    const before = project.members.length;
    project.members = project.members.filter(
      (member) => member.user.toString() !== userId,
    );
    if (before === project.members.length) {
      throw new NotFoundError("You are not a member of this project");
    }

    await project.save();

    return SuccessResponse({
      message: "You left the project successfully",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }

  async inviteMember(
    userId: string,
    projectId: string,
    payload: {
      email: string;
      role?: ProjectRole;
    },
  ) {
    const project = await this.getProjectOrThrow(projectId);
    this.ensureCanAdmin(project, userId);

    const email = payload.email.trim().toLowerCase();
    const role = payload.role ?? ProjectRole.MEMBER;
    if (role === ProjectRole.OWNER) {
      throw new BadRequestError("Cannot invite a member as owner");
    }

    const alreadyMember = await User.findOne({ email });
    if (
      alreadyMember &&
      project.members.some(
        (member) => member.user.toString() === alreadyMember._id.toString(),
      )
    ) {
      throw new BadRequestError("User is already a project member");
    }

    const hasPending = await ProjectInvitation.findOne({
      project: project._id,
      email,
      status: InvitationStatus.PENDING,
      expiresAt: { $gt: new Date() },
    });
    if (hasPending) {
      throw new BadRequestError(
        "A pending invitation already exists for this email",
      );
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + this.inviteExpiryMs);

    const invitation = await ProjectInvitation.create({
      project: project._id,
      email,
      role,
      tokenHash,
      invitedBy: userId,
      status: InvitationStatus.PENDING,
      expiresAt,
    });

    const acceptUrl = `${FRONTEND_URL}/invite/accept?token=${rawToken}`;
    await transporter.sendMail({
      to: email,
      subject: `You've been invited to join ${project.name}`,
      html: `
        <p>You were invited to join project <strong>${project.name}</strong>.</p>
        <p>Role: <strong>${role}</strong></p>
        <p>Accept your invite: <a href="${acceptUrl}">${acceptUrl}</a></p>
        <p>This invite expires in 7 days.</p>
      `,
    });

    return SuccessResponse({
      message: "Invitation sent successfully",
      data: {
        id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },
      httpStatus: StatusCodes.CREATED,
    });
  }

  async listInvitations(userId: string, projectId: string) {
    const project = await this.getProjectOrThrow(projectId);
    this.ensureCanAdmin(project, userId);

    const invitations = await ProjectInvitation.find({
      project: project._id,
      status: InvitationStatus.PENDING,
      expiresAt: { $gt: new Date() },
    })
      .select("_id email role status expiresAt")
      .sort({ createdAt: -1 })
      .lean();

    return SuccessResponse({
      message: "Project invitations fetched successfully",
      data: invitations.map((invitation) => ({
        _id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      })),
      httpStatus: StatusCodes.OK,
    });
  }

  async resendInvitation(
    userId: string,
    projectId: string,
    invitationId: string,
  ) {
    const project = await this.getProjectOrThrow(projectId);
    this.ensureCanAdmin(project, userId);

    const invitation = await ProjectInvitation.findOne({
      _id: invitationId,
      project: project._id,
    });
    if (!invitation) {
      throw new NotFoundError("Invitation not found");
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestError("Only pending invitations can be resent");
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    invitation.tokenHash = this.hashToken(rawToken);
    invitation.expiresAt = new Date(Date.now() + this.inviteExpiryMs);
    await invitation.save();

    const acceptUrl = `${FRONTEND_URL}/invite/accept?token=${rawToken}`;
    await transporter.sendMail({
      to: invitation.email,
      subject: `Invitation reminder for ${project.name}`,
      html: `
        <p>This is a reminder to join project <strong>${project.name}</strong>.</p>
        <p>Accept your invite: <a href="${acceptUrl}">${acceptUrl}</a></p>
      `,
    });

    return SuccessResponse({
      message: "Invitation resent successfully",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }

  async cancelInvitation(
    userId: string,
    projectId: string,
    invitationId: string,
  ) {
    const project = await this.getProjectOrThrow(projectId);
    this.ensureCanAdmin(project, userId);

    const invitation = await ProjectInvitation.findOne({
      _id: invitationId,
      project: project._id,
    });
    if (!invitation) {
      throw new NotFoundError("Invitation not found");
    }
    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestError("Accepted invitations cannot be cancelled");
    }
    if (invitation.status === InvitationStatus.CANCELLED) {
      throw new BadRequestError("Invitation is already cancelled");
    }

    invitation.status = InvitationStatus.CANCELLED;
    invitation.cancelledAt = new Date();
    await invitation.save();

    return SuccessResponse({
      message: "Invitation cancelled successfully",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }

  async acceptInvitation(userId: string, userEmail: string, token: string) {
    const invitation = await ProjectInvitation.findOne({
      tokenHash: this.hashToken(token),
    });
    if (!invitation) {
      throw new NotFoundError("Invitation not found");
    }
    if (invitation.status === InvitationStatus.CANCELLED) {
      throw new BadRequestError("Invitation has been revoked");
    }
    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestError("Invitation has already been accepted");
    }
    if (invitation.expiresAt < new Date()) {
      invitation.status = InvitationStatus.EXPIRED;
      await invitation.save();
      throw new BadRequestError("Invitation has expired");
    }
    if (invitation.status === InvitationStatus.EXPIRED) {
      throw new BadRequestError("Invitation has expired");
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestError("Invitation is not valid for acceptance");
    }
    if (invitation.email !== userEmail.trim().toLowerCase()) {
      throw new ForbiddenError(
        "You can only accept invitations sent to your email",
      );
    }

    const project = await this.getProjectOrThrow(invitation.project.toString());
    const alreadyMember = project.members.some(
      (member) => member.user.toString() === userId,
    );
    if (!alreadyMember) {
      project.members.push({
        user: new Types.ObjectId(userId),
        role: invitation.role,
        invitedBy: invitation.invitedBy,
        joinedAt: new Date(),
      });
      project.metadata.lastActivityAt = new Date();
      await project.save();
    }

    invitation.status = InvitationStatus.ACCEPTED;
    invitation.acceptedBy = userId as never;
    invitation.acceptedAt = new Date();
    await invitation.save();

    return SuccessResponse({
      message: "Invitation accepted successfully",
      data: this.toProjectResponse(project),
      httpStatus: StatusCodes.OK,
    });
  }

  async listMyInvitations(
    userEmail: string,
    status: InvitationStatus = InvitationStatus.PENDING,
  ) {
    const query: {
      email: string;
      status: InvitationStatus;
      expiresAt?: { $gt: Date };
    } = {
      email: userEmail.trim().toLowerCase(),
      status,
    };

    if (status === InvitationStatus.PENDING) {
      query.expiresAt = { $gt: new Date() };
    }

    const invitations = await ProjectInvitation.find(query)
      .select("_id project role status expiresAt")
      .populate("project", "_id name slug visibility")
      .sort({ createdAt: -1 });

    return SuccessResponse({
      message: `${status.toLowerCase()} invitations fetched successfully`,
      data: invitations.map((invitation) => ({
        _id: invitation._id,
        project: invitation.project,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      })),
      httpStatus: StatusCodes.OK,
    });
  }
}

const projectService = new ProjectService();
export default projectService;
