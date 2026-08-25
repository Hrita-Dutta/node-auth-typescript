import mongoose from "mongoose";
import { log } from "node:console";

export async function connectToDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log("MongoDB connection is successfully established");
  } catch (err) {
    console.error("Mongodb connection error!");
    process.exit(1);
  }
}
