import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.env") });

import { config } from "../config.js";
import { Resource } from "../models/index.js";
import { generateResourceEmbedding } from "../services/embedding.js";
import PQueue from "p-queue";

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(config.mongoUri);
  console.log("Connected.");

  const dryRun = process.argv.includes("--dry-run");

  const resources = await Resource.find({ 
    $or: [
      { embedding: null },
      { embedding: { $exists: false } },
      { embedding: { $size: 0 } }
    ]
  });

  console.log(`Found ${resources.length} resources missing embeddings.`);

  if (dryRun) {
    console.log("Dry run mode. Exiting.");
    process.exit(0);
  }

  const queue = new PQueue({ concurrency: 5 });
  let completed = 0;
  let failed = 0;

  for (const resource of resources) {
    queue.add(async () => {
      try {
        const embedding = await generateResourceEmbedding(resource);
        if (embedding) {
          await Resource.updateOne({ _id: resource._id }, { $set: { embedding } });
          completed++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error(`Failed to process ${resource._id}:`, err);
        failed++;
      }
      
      if ((completed + failed) % 10 === 0) {
        console.log(`Progress: ${completed + failed} / ${resources.length}`);
      }
    });
  }

  await queue.onIdle();
  console.log(`Backfill complete. Success: ${completed}, Failed: ${failed}`);
  
  await mongoose.disconnect();
}

run().catch(err => {
  console.error("Backfill script failed:", err);
  process.exit(1);
});
