import mongoose from "mongoose";
import { config } from "../config.js";
import { Resource } from "../models/index.js";

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(config.mongoUri);
  console.log("Connected.");

  console.log("Migrating intentTypes: project, idea, goal -> mission");
  
  const result = await Resource.updateMany(
    { intentType: { $in: ["project", "idea", "goal"] } },
    { $set: { intentType: "mission" } }
  );

  console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch(console.error);
