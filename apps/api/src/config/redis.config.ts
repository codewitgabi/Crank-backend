import IORedis from "ioredis";
import {
  REDIS_HOST,
  REDIS_PASSWORD,
  REDIS_PORT,
  REDIS_USERNAME,
} from "../utils/constants";
import { BadRequestError } from "../utils/api.errors";

const getRedisPort = (): number => {
  const parsedPort = Number(REDIS_PORT);
  if (!REDIS_PORT || Number.isNaN(parsedPort)) {
    throw new BadRequestError("REDIS_PORT must be a valid number");
  }
  return parsedPort;
};

const getRedisHost = (): string => {
  if (!REDIS_HOST) {
    throw new BadRequestError("REDIS_HOST is required");
  }
  return REDIS_HOST;
};

export const createRedisConnection = () => {
  return new IORedis({
    host: getRedisHost(),
    port: getRedisPort(),
    username: REDIS_USERNAME || undefined,
    password: REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    /** Avoid hanging HTTP handlers forever when Redis is down or unreachable */
    connectTimeout: 15_000,
    enableOfflineQueue: false,
  });
};

