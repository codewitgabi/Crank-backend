import { config } from "dotenv";
config();

export const NODE_ENV =
  (process.env.NODE_ENV as "development" | "production" | "test") ||
  "development";
export const LOG_LEVEL = process.env.LOG_LEVEL as
  | "fatal"
  | "error"
  | "warn"
  | "info"
  | "debug"
  | "trace"
  | "silent"
  | undefined;
export const SERVICE_NAME =
  (process.env.SERVICE_NAME as string) || "crank-backend";
export const DATABASE_URI = process.env.DATABASE_URI as string;
export const DATABASE_URI_TEST = process.env.DATABASE_URI_TEST as string;
export const SMTP_HOST = process.env.SMTP_HOST as string;
export const EMAIL_PORT = process.env.EMAIL_PORT as string;
export const EMAIL_USER = process.env.EMAIL_USER as string;
export const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD as string;
export const JWT_SECRET = process.env.JWT_SECRET as string;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;
export const JWT_EXPIRE = (process.env.JWT_EXPIRE as string) || "15m";
export const JWT_REFRESH_EXPIRE =
  (process.env.JWT_REFRESH_EXPIRE as string) || "7d";
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
export const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID as string;
export const GITHUB_CLIENT_SECRET =
  (process.env.GITHUB_CLIENT_SECRET as string) || "";
export const FIREBASE_SERVICE_ACCOUNT = process.env
  .FIREBASE_SERVICE_ACCOUNT as string;
export const FRONTEND_URL =
  (process.env.FRONTEND_URL as string) || "http://localhost:3000";
export const REDIS_USERNAME = process.env.REDIS_USERNAME as string;
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD as string;
export const REDIS_HOST = process.env.REDIS_HOST as string;
export const REDIS_PORT = process.env.REDIS_PORT as string;
