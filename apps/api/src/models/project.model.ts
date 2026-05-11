import { Document, Schema, Types, model } from "mongoose";

export enum ProjectVisibility {
  PRIVATE = "PRIVATE",
  INTERNAL = "INTERNAL",
}

export enum ProjectRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  VIEWER = "VIEWER",
}

export interface IProjectMember {
  user: Types.ObjectId;
  role: ProjectRole;
  invitedBy?: Types.ObjectId;
  joinedAt: Date;
}

export interface IProject extends Document {
  name: string;
  slug: string;
  description?: string;
  owner: Types.ObjectId;
  visibility: ProjectVisibility;
  repositoryUrl?: string;
  defaultBranch?: string;
  tags: string[];
  members: IProjectMember[];
  metadata: {
    environmentCount: number;
    testCaseCount: number;
    lastActivityAt?: Date;
  };
  archivedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const projectMemberSchema = new Schema<IProjectMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: Object.values(ProjectRole),
      required: true,
      default: ProjectRole.MEMBER,
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
    joinedAt: { type: Date, default: Date.now, required: true },
  },
  { _id: false },
);

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 2,
      maxlength: 120,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    description: { type: String, trim: true, maxlength: 2000 },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    visibility: {
      type: String,
      enum: Object.values(ProjectVisibility),
      default: ProjectVisibility.PRIVATE,
      required: true,
    },
    repositoryUrl: { type: String, trim: true, maxlength: 500 },
    defaultBranch: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "main",
    },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 50 }],
    members: {
      type: [projectMemberSchema],
      default: [],
      validate: {
        validator: (members: IProjectMember[]) => {
          const keys = members.map((member) => member.user.toString());
          return new Set(keys).size === keys.length;
        },
        message: "Duplicate members are not allowed in a project",
      },
    },
    metadata: {
      environmentCount: { type: Number, min: 0, default: 0 },
      testCaseCount: { type: Number, min: 0, default: 0 },
      lastActivityAt: { type: Date },
    },
    archivedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

projectSchema.index({ owner: 1, slug: 1 }, { unique: true });
projectSchema.index({ owner: 1, createdAt: -1 });
projectSchema.index({ "members.user": 1, deletedAt: 1 });
projectSchema.index({ deletedAt: 1, archivedAt: 1 });

projectSchema.pre("validate", function () {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // Ensure project owner always exists in members as OWNER.
  const ownerId = this.owner.toString();
  const ownerMember = this.members.find(
    (member) => member.user.toString() === ownerId,
  );

  if (!ownerMember) {
    this.members.unshift({
      user: this.owner,
      role: ProjectRole.OWNER,
      joinedAt: new Date(),
    });
  } else {
    ownerMember.role = ProjectRole.OWNER;
  }
});

const Project = model<IProject>("Project", projectSchema);
export default Project;
