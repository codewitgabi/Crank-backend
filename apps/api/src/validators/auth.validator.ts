import { body } from "express-validator";
import { validateRequest } from "../middlewares/validation.middleware";

export const EmailVerificationSchema = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .toLowerCase(),
  validateRequest,
];

export const VerifyOTPSchema = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .toLowerCase(),
  body("otp")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .isNumeric()
    .withMessage("OTP must contain only numbers"),
  validateRequest,
];

export const RegisterSchema = [
  body("username")
    .notEmpty()
    .withMessage("Username is required")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage(
      "Username can only contain letters, numbers, underscores, dots, and hyphens",
    ),
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .toLowerCase(),
  body("password")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be between 8 and 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/)
    .withMessage(
      "Password must contain uppercase, lowercase, number, and special character",
    ),
  validateRequest,
];

export const LoginSchema = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .toLowerCase(),
  body("password").notEmpty().withMessage("Password is required"),
  validateRequest,
];

export const GoogleLoginSchema = [
  body("idToken")
    .isString()
    .notEmpty()
    .withMessage("Google idToken is required"),
  validateRequest,
];

export const GithubLoginSchema = [
  body("accessToken")
    .isString()
    .notEmpty()
    .withMessage("GitHub accessToken is required"),
  validateRequest,
];

export const RefreshTokenSchema = [
  body("refreshToken").notEmpty().withMessage("Refresh token is required"),
  validateRequest,
];

export const LogoutSchema = [
  body("refreshToken")
    .optional()
    .isString()
    .notEmpty()
    .withMessage("Refresh token cannot be empty if provided"),
  validateRequest,
];

export const ForgotPasswordSchema = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .toLowerCase(),
  validateRequest,
];

export const VerifyPasswordResetOTPSchema = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .toLowerCase(),
  body("otp")
    .isLength({ min: 5, max: 5 })
    .withMessage("OTP must be 5 digits")
    .isNumeric()
    .withMessage("OTP must contain only numbers"),
  validateRequest,
];

export const ResetPasswordSchema = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .toLowerCase(),
  body("password")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be between 8 and 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/)
    .withMessage(
      "Password must contain uppercase, lowercase, number, and special character",
    ),
  validateRequest,
];

export const ChangePasswordSchema = [
  body("currentPassword")
    .isString()
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8, max: 128 })
    .withMessage("New password must be between 8 and 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/)
    .withMessage(
      "New password must contain uppercase, lowercase, number, and special character",
    ),
  validateRequest,
];
