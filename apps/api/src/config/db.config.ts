import mongoose from "mongoose";
import { DATABASE_URI, DATABASE_URI_TEST, NODE_ENV } from "../utils/constants";
import { BadRequestError } from "../utils/api.errors";

const connectDb = async () => {
  const uri = NODE_ENV === "test" ? DATABASE_URI_TEST : DATABASE_URI;

  if (!uri) {
    throw new BadRequestError(
      NODE_ENV === "test"
        ? "DATABASE_URI_TEST is required in test environment"
        : "DATABASE_URI is required",
    );
  }

  return await mongoose.connect(uri);
};

export default connectDb;
