import argon2 from "argon2";
import jwt from "jsonwebtoken";
import OTP, { OTPPurpose } from "../../src/models/otp.model";
import User from "../../src/models/user.model";
import {
  JWT_EXPIRE,
  JWT_REFRESH_EXPIRE,
  JWT_REFRESH_SECRET,
  JWT_SECRET,
} from "../../src/utils/constants";

export const createUser = async (overrides?: Partial<{
  email: string;
  username: string;
  password: string;
  isEmailVerified: boolean;
}>) => {
  const password = overrides?.password ?? "Password123!";
  const hashedPassword = await argon2.hash(password);

  const user = await User.create({
    email: overrides?.email ?? "user@example.com",
    username: overrides?.username ?? "user123",
    password: hashedPassword,
    isEmailVerified: overrides?.isEmailVerified ?? true,
    authProviders: {},
  });

  return { user, plainPassword: password };
};

export const createOtp = async (payload: {
  email: string;
  otp: string;
  purpose: OTPPurpose;
  verified?: boolean;
  expiresAt?: Date;
  attempts?: number;
}) => {
  return OTP.create({
    email: payload.email,
    otp: await argon2.hash(payload.otp),
    purpose: payload.purpose,
    verified: payload.verified ?? false,
    expiresAt: payload.expiresAt ?? new Date(Date.now() + 10 * 60 * 1000),
    attempts: payload.attempts ?? 0,
  });
};

export const createAccessToken = (userId: string, email: string) =>
  jwt.sign({ userId, email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
  } as jwt.SignOptions);

export const createRefreshToken = (userId: string, email: string) =>
  jwt.sign({ userId, email }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRE,
  } as jwt.SignOptions);
