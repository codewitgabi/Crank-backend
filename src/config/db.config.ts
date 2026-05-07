import mongoose from "mongoose";
import { DATABASE_URI } from "../utils/constants";

const connectDb = async () => {
  return await mongoose.connect(DATABASE_URI);
};

export default connectDb;
