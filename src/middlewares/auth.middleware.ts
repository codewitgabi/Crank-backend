import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../utils/constants";
import { UnauthorizedError } from "../utils/api.errors";
import authService from "../services/auth.service";
import User from "../models/user.model";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
      token?: string;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing bearer token");
    }

    const token = authHeader.substring(7);
    const isBlacklisted = await authService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedError("Token has been revoked");
    }

    const decoded = jwt.verify(token, JWT_SECRET as string) as {
      userId: string;
      email: string;
    };

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError("User no longer exists");
    }

    req.user = { userId: decoded.userId, email: decoded.email };
    req.token = token;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError("Invalid or expired token"));
      return;
    }
    next(error);
  }
};

export const requireAuth = authenticate;
