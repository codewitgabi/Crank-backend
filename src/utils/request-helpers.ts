import { Request } from "express";
import { UnauthorizedError } from "./api.errors";

export const getAuthenticatedUser = (req: Request) => {
  if (!req.user?.userId || !req.user?.email) {
    throw new UnauthorizedError("Unauthorized");
  }
  return req.user;
};

export const getRouteParam = (
  value: string | string[] | undefined,
  name: string,
): string => {
  if (!value) {
    throw new UnauthorizedError(`Missing route parameter: ${name}`);
  }
  return Array.isArray(value) ? value[0] : value;
};
