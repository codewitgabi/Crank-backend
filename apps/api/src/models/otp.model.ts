import { Document, Schema, model } from "mongoose";

export enum OTPPurpose {
  EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
  PASSWORD_RESET = "PASSWORD_RESET",
}

export interface IOTP extends Document {
  email: string;
  otp: string;
  purpose: OTPPurpose;
  verified: boolean;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<IOTP>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: { type: String, required: true },
    purpose: {
      type: String,
      enum: Object.values(OTPPurpose),
      required: true,
      index: true,
    },
    verified: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true },
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = model<IOTP>("OTP", otpSchema);
export default OTP;
