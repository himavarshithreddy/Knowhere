import mongoose, { Schema, type InferSchemaType } from "mongoose";

const interactionEventSchema = new Schema({
  userId: { type: String, required: true, index: true },
  resourceId: { type: String, required: true, index: true },
  type: { type: String, required: true, enum: ["save", "open", "complete", "rediscover_click", "use", "build", "archive", "trash"] },
}, { timestamps: true });

interactionEventSchema.index({ userId: 1, createdAt: -1 });
interactionEventSchema.index({ resourceId: 1, type: 1 });

export type InteractionEventDoc = InferSchemaType<typeof interactionEventSchema> & { _id: mongoose.Types.ObjectId; createdAt: Date; updatedAt: Date };
export const InteractionEvent = mongoose.model("InteractionEvent", interactionEventSchema);

const searchEventSchema = new Schema({
  userId: { type: String, required: true, index: true },
  query: { type: String, required: true },
  resultsCount: { type: Number, required: true },
}, { timestamps: true });

searchEventSchema.index({ userId: 1, createdAt: -1 });

export type SearchEventDoc = InferSchemaType<typeof searchEventSchema> & { _id: mongoose.Types.ObjectId; createdAt: Date; updatedAt: Date };
export const SearchEvent = mongoose.model("SearchEvent", searchEventSchema);

const notificationLedgerSchema = new Schema({
  userId: { type: String, required: true },
  resourceId: { type: String, required: true },
  tier: { type: Number, required: true },
  selectionReason: { 
    type: String, 
    required: true, 
    enum: [
      "tier1_search_match",       // Tier 1: matched a repeated search query
      "tier2_inactivity_recovery", // Tier 2: saved >90 days ago, never opened
      "tier2_opportunity_resurrection", // Tier 2: old idea matching recent interests
      "tier3_knowledge_decay",    // Tier 3: opened but never applied
      "tier1_default",            // Tier 1: default fallback
      "tier2_default",            // Tier 2: default fallback
      "tier3_default",            // Tier 3: default fallback
      "tier4_default",            // Tier 4: default fallback
      "spaced_repetition",        // SR schedule: clicked+engaged resource due for review
      "escape_hatch",             // All candidates on cooldown, picked least-recently-shown
      "cold_start",               // User has <5 resources, simple round-robin
      "diversity_fallback",       // Normal pick was filtered by diversity, took next best
      "scored_fallback",          // Tier 4: analytics-scored final fallback
      "unread_random",            // Random unread resource (no tier matches)
    ]
  },
  clicked: { type: Boolean, default: false },
  clickedAt: { type: Date, default: null },
}, { timestamps: true }); // createdAt = when notification was sent

notificationLedgerSchema.index({ userId: 1, createdAt: -1 });
notificationLedgerSchema.index({ userId: 1, resourceId: 1, createdAt: -1 });
notificationLedgerSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 86400 }); // 90-day TTL

export type NotificationLedgerDoc = InferSchemaType<typeof notificationLedgerSchema> & { _id: mongoose.Types.ObjectId; createdAt: Date; updatedAt: Date };
export const NotificationLedger = mongoose.model("NotificationLedger", notificationLedgerSchema);
