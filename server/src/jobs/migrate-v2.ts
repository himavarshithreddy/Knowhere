import mongoose from "mongoose";
import { config } from "../config.js";
import { Resource } from "../models/index.js";
import { classifyResource } from "../services/classifier.js";

async function runMigration() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(config.mongoUri);
  console.log("Connected.");

  console.log("Finding resources without intentType...");
  // We look for resources that either don't have intentType or are set to the default "knowledge"
  // but don't have tags yet.
  const resources = await Resource.find({
    $or: [
      { intentType: { $exists: false } },
      { tags: { $size: 0 } }
    ]
  });

  console.log(`Found ${resources.length} resources to migrate.`);

  let processed = 0;
  for (const resource of resources) {
    // If it's completely unmigrated, set defaults first
    if (!resource.intentType) resource.intentType = "knowledge";
    if (!resource.actionStatus) resource.actionStatus = "saved";
    if (resource.viewCount === undefined) resource.viewCount = 0;
    if (!resource.tags) resource.tags = [];

    const title = resource.title || resource.metadata?.title || "";
    const description = resource.description || "";
    
    try {
      const classification = await classifyResource(
        title,
        description,
        resource.url || undefined,
        resource.metadata ? {
          title: resource.metadata.title || undefined,
          description: resource.metadata.description || undefined,
          imageUrl: resource.metadata.imageUrl || undefined,
          faviconUrl: resource.metadata.faviconUrl || undefined,
          siteName: resource.metadata.siteName || undefined,
          author: resource.metadata.author || undefined,
        } : undefined
      );
      resource.intentType = classification.intentType;
      resource.tags = classification.tags;
    } catch (err) {
      console.warn(`Classification failed for resource ${resource._id}:`, err);
    }

    await resource.save();
    processed++;
    if (processed % 10 === 0) {
      console.log(`Processed ${processed}/${resources.length}...`);
    }
    
    // Add a small delay to avoid hitting rate limits if using Gemini
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("Migration complete!");
  process.exit(0);
}

runMigration().catch(console.error);
