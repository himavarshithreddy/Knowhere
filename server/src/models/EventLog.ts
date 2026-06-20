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
