import argon2 from "argon2";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import User from "../models/user.model";
import OTP, { OTPPurpose } from "../models/otp.model";
import TokenBlacklist from "../models/tokenBlacklist.model";
import transporter from "../config/mail.config";
import {
  GOOGLE_CLIENT_ID,
  GITHUB_CLIENT_ID,
  JWT_EXPIRE,
  JWT_REFRESH_EXPIRE,
  JWT_REFRESH_SECRET,
  JWT_SECRET,
} from "../utils/constants";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../utils/api.errors";
import { SuccessResponse } from "../utils/response";
import { LoginData, RegisterData, TokenPayload } from "../types/auth.type";

interface OAuthProfile {
  provider: "google" | "github";
  providerId: string;
  email: string;
  username?: string;
}

class AuthService {
  private readonly OTP_COOLDOWN_MS = 60 * 1000;
  private readonly OTP_EXPIRY_MS = 10 * 60 * 1000;
  private readonly OTP_MAX_ATTEMPTS = 5;

  private generateOTP(digits = 6): string {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return crypto.randomInt(min, max + 1).toString();
  }

  private generateTokens(payload: TokenPayload): {
    accessToken: string;
    refreshToken: string;
  } {
    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRE,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRE,
    } as jwt.SignOptions);

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: {
    _id: unknown;
    email: string;
    username: string;
    isEmailVerified: boolean;
    authProviders?: { googleId?: string; githubId?: string };
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user._id,
      email: user.email,
      username: user.username,
      isEmailVerified: user.isEmailVerified,
      hasPassword: Boolean((user as { password?: string }).password),
      providers: {
        google: Boolean(user.authProviders?.googleId),
        github: Boolean(user.authProviders?.githubId),
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async sendOTPEmail(
    email: string,
    otp: string,
    type: "verify" | "reset",
  ) {
    const isVerification = type === "verify";
    await transporter.sendMail({
      to: email,
      subject: isVerification
        ? "Verify your email address"
        : "Reset your password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${isVerification ? "Email verification" : "Password reset"}</h2>
          <p>Use this code to continue:</p>
          <p style="font-size: 30px; letter-spacing: 8px; font-weight: bold;">${otp}</p>
          <p>This code will expire in 10 minutes.</p>
          <p>If this was not you, you can ignore this email.</p>
        </div>
      `,
    });
  }

  private async verifyGoogleToken(idToken: string): Promise<OAuthProfile> {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    if (!response.ok) {
      throw new UnauthorizedError("Invalid Google token");
    }

    const data = (await response.json()) as {
      sub?: string;
      aud?: string;
      email?: string;
      email_verified?: string;
    };

    if (!data.sub || !data.email || data.email_verified !== "true") {
      throw new UnauthorizedError("Google account email is not verified");
    }

    if (GOOGLE_CLIENT_ID && data.aud !== GOOGLE_CLIENT_ID) {
      throw new UnauthorizedError("Google token audience mismatch");
    }

    return {
      provider: "google",
      providerId: data.sub,
      email: data.email.toLowerCase(),
      username: data.email.split("@")[0],
    };
  }

  private async verifyGithubToken(accessToken: string): Promise<OAuthProfile> {
    const userResp = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!userResp.ok) {
      throw new UnauthorizedError("Invalid GitHub token");
    }

    const emailResp = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!emailResp.ok) {
      throw new UnauthorizedError("Could not fetch GitHub email");
    }

    const userData = (await userResp.json()) as { id?: number; name?: string };
    const emailData = (await emailResp.json()) as Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }>;

    const verifiedEmail = emailData.find((e) => e.primary && e.verified);
    if (!userData.id || !verifiedEmail?.email) {
      throw new UnauthorizedError(
        "GitHub account must have a verified primary email",
      );
    }

    if (GITHUB_CLIENT_ID && !accessToken.startsWith("gh")) {
      // Basic token-shape check to prevent accidental wrong token type.
    }

    return {
      provider: "github",
      providerId: userData.id.toString(),
      email: verifiedEmail.email.toLowerCase(),
      username:
        (userData.name ?? "").trim() || verifiedEmail.email.split("@")[0],
    };
  }

  private async generateUniqueUsername(baseUsername: string): Promise<string> {
    const normalizedBase =
      baseUsername
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/g, "")
        .slice(0, 20) || "user";

    let candidate = normalizedBase;
    let suffix = 0;

    while (await User.findOne({ username: candidate })) {
      suffix += 1;
      candidate = `${normalizedBase}${suffix}`;
    }

    return candidate;
  }

  private async loginOrCreateOAuthUser(profile: OAuthProfile) {
    const providerField =
      profile.provider === "google"
        ? "authProviders.googleId"
        : "authProviders.githubId";

    let user = await User.findOne({
      $or: [{ email: profile.email }, { [providerField]: profile.providerId }],
    }).select("+password");

    if (!user) {
      const username = await this.generateUniqueUsername(
        profile.username ?? profile.email.split("@")[0],
      );
      user = await User.create({
        email: profile.email,
        username,
        isEmailVerified: true,
        authProviders:
          profile.provider === "google"
            ? { googleId: profile.providerId }
            : { githubId: profile.providerId },
      });
    } else {
      if (profile.provider === "google" && !user.authProviders?.googleId) {
        user.authProviders.googleId = profile.providerId;
      }
      if (profile.provider === "github" && !user.authProviders?.githubId) {
        user.authProviders.githubId = profile.providerId;
      }
      user.isEmailVerified = true;
      await user.save();
    }

    const tokens = this.generateTokens({
      userId: user._id.toString(),
      email: user.email,
    });

    return SuccessResponse({
      message: `${profile.provider} login successful`,
      data: {
        user: this.sanitizeUser(user.toObject()),
        ...tokens,
      },
      httpStatus: StatusCodes.OK,
    });
  }

  async sendEmailVerification(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser?.isEmailVerified) {
      throw new BadRequestError("Email already registered");
    }

    const latestOtp = await OTP.findOne({
      email: normalizedEmail,
      purpose: OTPPurpose.EMAIL_VERIFICATION,
    }).sort({ createdAt: -1 });

    if (
      latestOtp &&
      Date.now() - latestOtp.createdAt.getTime() < this.OTP_COOLDOWN_MS
    ) {
      throw new BadRequestError("Please wait before requesting a new code");
    }

    const otp = this.generateOTP(6);
    const hashedOTP = await argon2.hash(otp);
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MS);

    await OTP.deleteMany({
      email: normalizedEmail,
      purpose: OTPPurpose.EMAIL_VERIFICATION,
    });

    await OTP.create({
      email: normalizedEmail,
      otp: hashedOTP,
      expiresAt,
      verified: false,
      purpose: OTPPurpose.EMAIL_VERIFICATION,
      attempts: 0,
    });

    await this.sendOTPEmail(normalizedEmail, otp, "verify");

    return SuccessResponse({
      message: "Verification code sent to your email",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }

  async verifyOTP(email: string, otp: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const otpRecord = await OTP.findOne({
      email: normalizedEmail,
      verified: false,
      purpose: OTPPurpose.EMAIL_VERIFICATION,
    });

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      throw new BadRequestError("Invalid or expired OTP");
    }

    if (otpRecord.attempts >= this.OTP_MAX_ATTEMPTS) {
      throw new BadRequestError("Too many attempts, request a new OTP");
    }

    const isOTPValid = await argon2.verify(otpRecord.otp, otp);
    if (!isOTPValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new BadRequestError("Invalid or expired OTP");
    }

    otpRecord.verified = true;
    await otpRecord.save();
    await User.updateOne(
      { email: normalizedEmail, isEmailVerified: false },
      { $set: { isEmailVerified: true } },
    );

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password",
    );
    if (user) {
      const tokens = this.generateTokens({
        userId: user._id.toString(),
        email: user.email,
      });

      return SuccessResponse({
        message: "Email verified successfully",
        data: {
          user: this.sanitizeUser(user.toObject()),
          ...tokens,
        },
        httpStatus: StatusCodes.OK,
      });
    }

    return SuccessResponse({
      message: "Email verified successfully",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }

  async register(data: RegisterData) {
    const normalizedEmail = data.email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (!existingUser.isEmailVerified) {
        throw new BadRequestError(
          "Account already exists but email is not verified. Verify your email or request a new code.",
        );
      }
      throw new BadRequestError("User already exists");
    }

    const hashedPassword = await argon2.hash(data.password);
    const username = await this.generateUniqueUsername(
      data.username ?? normalizedEmail.split("@")[0],
    );
    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      username,
      isEmailVerified: false,
      authProviders: {},
    });
    await this.sendEmailVerification(normalizedEmail);

    return SuccessResponse({
      message: "Registration successful. Please verify your email to continue.",
      data: {
        user: this.sanitizeUser(user.toObject()),
        requiresEmailVerification: true,
      },
      httpStatus: StatusCodes.CREATED,
    });
  }

  async login(data: LoginData) {
    const normalizedEmail = data.email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password",
    );
    if (!user || !user.password) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedError(
        "Email not verified. Please verify your email before logging in.",
      );
    }

    const isPasswordValid = await argon2.verify(user.password, data.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const tokens = this.generateTokens({
      userId: user._id.toString(),
      email: user.email,
    });

    return SuccessResponse({
      message: "Login successful",
      data: {
        user: this.sanitizeUser(user.toObject()),
        ...tokens,
      },
      httpStatus: StatusCodes.OK,
    });
  }

  async loginWithGoogle(idToken: string) {
    const profile = await this.verifyGoogleToken(idToken);
    return this.loginOrCreateOAuthUser(profile);
  }

  async loginWithGithub(accessToken: string) {
    const profile = await this.verifyGithubToken(accessToken);
    return this.loginOrCreateOAuthUser(profile);
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(
        refreshToken,
        JWT_REFRESH_SECRET,
      ) as TokenPayload;
      const blacklisted = await TokenBlacklist.findOne({ token: refreshToken });
      if (blacklisted) {
        throw new UnauthorizedError("Token has been revoked");
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      const tokens = this.generateTokens({
        userId: user._id.toString(),
        email: user.email,
      });

      const decodedToken = jwt.decode(refreshToken) as jwt.JwtPayload | null;
      if (decodedToken?.exp) {
        await TokenBlacklist.updateOne(
          { token: refreshToken },
          { token: refreshToken, expiresAt: new Date(decodedToken.exp * 1000) },
          { upsert: true },
        );
      }

      return SuccessResponse({
        message: "Token refreshed successfully",
        data: tokens,
        httpStatus: StatusCodes.OK,
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError("Invalid refresh token");
      }
      throw error;
    }
  }

  async logout(accessToken: string, refreshToken?: string) {
    if (!accessToken || accessToken.trim() === "") {
      throw new BadRequestError("Access token is required");
    }

    const decodedAccess = jwt.decode(accessToken) as jwt.JwtPayload | null;
    if (!decodedAccess) {
      throw new BadRequestError("Invalid access token format");
    }

    if (decodedAccess.exp) {
      await TokenBlacklist.updateOne(
        { token: accessToken },
        { token: accessToken, expiresAt: new Date(decodedAccess.exp * 1000) },
        { upsert: true },
      );
    }

    if (refreshToken) {
      const decodedRefresh = jwt.decode(refreshToken) as jwt.JwtPayload | null;
      if (decodedRefresh?.exp) {
        await TokenBlacklist.updateOne(
          { token: refreshToken },
          {
            token: refreshToken,
            expiresAt: new Date(decodedRefresh.exp * 1000),
          },
          { upsert: true },
        );
      }
    }

    return SuccessResponse({
      message: "Logged out successfully",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklisted = await TokenBlacklist.findOne({ token });
    return Boolean(blacklisted);
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      throw new NotFoundError("No account found with this email address");
    }

    const latestOtp = await OTP.findOne({
      email: normalizedEmail,
      purpose: OTPPurpose.PASSWORD_RESET,
    }).sort({ createdAt: -1 });

    if (
      latestOtp &&
      Date.now() - latestOtp.createdAt.getTime() < this.OTP_COOLDOWN_MS
    ) {
      throw new BadRequestError("Please wait before requesting a new code");
    }

    const otp = this.generateOTP(5);
    const hashedOTP = await argon2.hash(otp);
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MS);

    await OTP.deleteMany({
      email: normalizedEmail,
      purpose: OTPPurpose.PASSWORD_RESET,
    });
    await OTP.create({
      email: normalizedEmail,
      otp: hashedOTP,
      expiresAt,
      verified: false,
      purpose: OTPPurpose.PASSWORD_RESET,
      attempts: 0,
    });

    await this.sendOTPEmail(normalizedEmail, otp, "reset");

    return SuccessResponse({
      message: "Password reset code sent to your email",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }

  async verifyPasswordResetOTP(email: string, otp: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const otpRecord = await OTP.findOne({
      email: normalizedEmail,
      verified: false,
      purpose: OTPPurpose.PASSWORD_RESET,
    });

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      throw new BadRequestError("Invalid or expired verification code");
    }

    if (otpRecord.attempts >= this.OTP_MAX_ATTEMPTS) {
      throw new BadRequestError("Too many attempts, request a new code");
    }

    const isOTPValid = await argon2.verify(otpRecord.otp, otp);
    if (!isOTPValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new BadRequestError("Invalid or expired verification code");
    }

    otpRecord.verified = true;
    await otpRecord.save();

    return SuccessResponse({
      message: "Verification code verified successfully",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }

  async resetPassword(email: string, newPassword: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const verifiedOTP = await OTP.findOne({
      email: normalizedEmail,
      verified: true,
      purpose: OTPPurpose.PASSWORD_RESET,
    });
    if (!verifiedOTP) {
      throw new BadRequestError(
        "Please verify your email first before resetting password",
      );
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password",
    );
    if (!user || !user.password) {
      throw new NotFoundError("User not found");
    }

    const isSamePassword = await argon2.verify(user.password, newPassword);
    if (isSamePassword) {
      throw new BadRequestError(
        "New password must be different from current password",
      );
    }

    user.password = await argon2.hash(newPassword);
    await user.save();
    await OTP.deleteOne({ _id: verifiedOTP._id });

    return SuccessResponse({
      message: "Password reset successfully",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await User.findById(userId).select("+password");
    if (!user || !user.password) {
      throw new NotFoundError("User not found");
    }

    const isPasswordValid = await argon2.verify(user.password, currentPassword);
    if (!isPasswordValid) {
      throw new BadRequestError("Current password is incorrect");
    }

    const isSamePassword = await argon2.verify(user.password, newPassword);
    if (isSamePassword) {
      throw new BadRequestError(
        "New password must be different from current password",
      );
    }

    user.password = await argon2.hash(newPassword);
    await user.save();

    return SuccessResponse({
      message: "Password changed successfully",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }

  async getProfile(userId: string) {
    const user = await User.findById(userId).select("+password");
    if (!user) {
      throw new NotFoundError("User not found");
    }

    return SuccessResponse({
      message: "Profile fetched successfully",
      data: this.sanitizeUser(user.toObject()),
      httpStatus: StatusCodes.OK,
    });
  }
}

const authService = new AuthService();
export default authService;
