import { Router } from "express";
import {
  changePassword,
  forgotPassword,
  githubLogin,
  githubOAuthExchange,
  googleLogin,
  login,
  logout,
  me,
  refreshToken,
  register,
  resetPassword,
  sendEmailVerification,
  verifyOTP,
  verifyPasswordResetOTP,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {
  ChangePasswordSchema,
  EmailVerificationSchema,
  ForgotPasswordSchema,
  GithubExchangeSchema,
  GithubLoginSchema,
  GoogleLoginSchema,
  LoginSchema,
  LogoutSchema,
  RefreshTokenSchema,
  RegisterSchema,
  ResetPasswordSchema,
  VerifyOTPSchema,
  VerifyPasswordResetOTPSchema,
} from "../validators/auth.validator";

const router = Router();

router.post(
  "/send-verification",
  EmailVerificationSchema,
  sendEmailVerification,
);
router.post("/verify-otp", VerifyOTPSchema, verifyOTP);
router.post("/register", RegisterSchema, register);
router.post("/login", LoginSchema, login);
router.post("/oauth/google", GoogleLoginSchema, googleLogin);
router.post("/oauth/github/exchange", GithubExchangeSchema, githubOAuthExchange);
router.post("/oauth/github", GithubLoginSchema, githubLogin);
router.post("/refresh-token", RefreshTokenSchema, refreshToken);
router.post("/logout", LogoutSchema, logout);
router.post("/forgot-password", ForgotPasswordSchema, forgotPassword);
router.post(
  "/verify-password-reset-otp",
  VerifyPasswordResetOTPSchema,
  verifyPasswordResetOTP,
);
router.post("/reset-password", ResetPasswordSchema, resetPassword);
router.post(
  "/change-password",
  authenticate,
  ChangePasswordSchema,
  changePassword,
);
router.get("/me", authenticate, me);

export default router;
