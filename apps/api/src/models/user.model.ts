import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  password?: string;
  username: string;
  isEmailVerified: boolean;
  authProviders: {
    googleId?: string;
    githubId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      select: false,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    authProviders: {
      googleId: String,
      githubId: String,
    },
  },
  { timestamps: true },
);

const User = model<IUser>("User", userSchema);
export default User;
