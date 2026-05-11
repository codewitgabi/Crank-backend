import { Document, Schema, Types, model } from "mongoose";
import { ProjectRole } from "./project.model";

export enum InvitationStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

export interface IProjectInvitation extends Document {
  project: Types.ObjectId;
  email: string;
  role: ProjectRole;
  tokenHash: string;
  invitedBy: Types.ObjectId;
  acceptedBy?: Types.ObjectId;
  status: InvitationStatus;
  expiresAt: Date;
  acceptedAt?: Date | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const projectInvitationSchema = new Schema<IProjectInvitation>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    role: {
      type: String,
      enum: Object.values(ProjectRole),
      default: ProjectRole.MEMBER,
      required: true,
    },
    tokenHash: { type: String, required: true, unique: true, index: true },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    acceptedBy: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: Object.values(InvitationStatus),
      default: InvitationStatus.PENDING,
      required: true,
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
    acceptedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

projectInvitationSchema.index(
  { project: 1, email: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: InvitationStatus.PENDING },
  },
);

const ProjectInvitation = model<IProjectInvitation>(
  "ProjectInvitation",
  projectInvitationSchema,
);

export default ProjectInvitation;
