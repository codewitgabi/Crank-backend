import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll } from "vitest";
import connectDb from "../../src/config/db.config";

beforeAll(async () => {
  await connectDb();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map(async (collection) => {
      await collection.deleteMany({});
    }),
  );
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});
