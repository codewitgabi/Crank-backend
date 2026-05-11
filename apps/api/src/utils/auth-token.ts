import { Request } from "express";
import { UnauthorizedError } from "./api.errors";

export const getBearerToken = (req: Request): string => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing bearer token");
  }

  return authHeader.split(" ")[1] ?? "";
};
