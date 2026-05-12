import { Request, Response } from "express";
import catchAsync from "../utils/catch-async";
import authService from "../services/auth.service";
import { UnauthorizedError } from "../utils/api.errors";
import { getBearerToken } from "../utils/auth-token";

export const sendEmailVerification = catchAsync(
  async (req: Request, res: Response) => {
    const response = await authService.sendEmailVerification(req.body.email);
    return res.status(response.httpStatus).json(response);
  },
);

export const verifyOTP = catchAsync(async (req: Request, res: Response) => {
  const response = await authService.verifyOTP(req.body.email, req.body.otp);
  return res.status(response.httpStatus).json(response);
});

export const register = catchAsync(async (req: Request, res: Response) => {
  const response = await authService.register(req.body);
  return res.status(response.httpStatus).json(response);
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const response = await authService.login(req.body);
  return res.status(response.httpStatus).json(response);
});

export const googleLogin = catchAsync(async (req: Request, res: Response) => {
  const response = await authService.loginWithGoogle(req.body.idToken);
  return res.status(response.httpStatus).json(response);
});

export const githubOAuthExchange = catchAsync(
  async (req: Request, res: Response) => {
    const response = await authService.exchangeGithubOAuthCode(
      req.body.code as string,
      req.body.redirectUri as string,
    );
    return res.status(response.httpStatus).json(response);
  },
);

export const githubLogin = catchAsync(async (req: Request, res: Response) => {
  const response = await authService.loginWithGithub(req.body.accessToken);
  return res.status(response.httpStatus).json(response);
});

export const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const response = await authService.refreshToken(req.body.refreshToken);
  return res.status(response.httpStatus).json(response);
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  const token = getBearerToken(req);
  const response = await authService.logout(token, req.body.refreshToken);
  return res.status(response.httpStatus).json(response);
});

export const forgotPassword = catchAsync(
  async (req: Request, res: Response) => {
    const response = await authService.forgotPassword(req.body.email);
    return res.status(response.httpStatus).json(response);
  },
);

export const verifyPasswordResetOTP = catchAsync(
  async (req: Request, res: Response) => {
    const response = await authService.verifyPasswordResetOTP(
      req.body.email,
      req.body.otp,
    );
    return res.status(response.httpStatus).json(response);
  },
);

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const response = await authService.resetPassword(
    req.body.email,
    req.body.password,
  );
  return res.status(response.httpStatus).json(response);
});

export const changePassword = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user?.userId) {
      throw new UnauthorizedError("Unauthorized");
    }

    const response = await authService.changePassword(
      req.user.userId,
      req.body.currentPassword,
      req.body.newPassword,
    );
    return res.status(response.httpStatus).json(response);
  },
);

export const me = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new UnauthorizedError("Unauthorized");
  }
  const response = await authService.getProfile(req.user.userId);
  return res.status(response.httpStatus).json(response);
});
