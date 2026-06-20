import mongoose, { Schema, type InferSchemaType } from "mongoose";

const preferencesSchema = new Schema({
  density: { type: String, default: "comfortable" },
  view: { type: String, default: "grid" },
  lastCategoryId: String
}, { _id: false });

const userSchema = new Schema({
  uid: { type: String, required: true, unique: true, index: true },
  authProvider: { type: String, enum: ["google", "coords", "code"], required: true, default: "google" },
  accessCodeLookup: { type: String, unique: true, sparse: true },
  accessCodeHash: { type: String, sparse: true },
  displayName: { type: String, required: true },
  email: { type: String, required: true, index: true },
  firebaseUid: { type: String, sparse: true, index: true },
  photoURL: { type: String, default: null },
  onboardingComplete: { type: Boolean, default: false },
  vaultPin: { type: String, sparse: true },
  preferences: { type: preferencesSchema, default: () => ({}) },
  pushSubscriptions: {
    type: [{
      endpoint: { type: String, required: true },
      keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true }
      }
    }],
    default: []
  }
}, { timestamps: true });

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId; createdAt: Date; updatedAt: Date };
export const User = mongoose.model("User", userSchema);

const categorySchema = new Schema({
  categoryId: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  normalizedName: { type: String, required: true },
  order: { type: Number, required: true },
  isDefault: { type: Boolean, default: false }
}, { timestamps: true });

categorySchema.index({ userId: 1, categoryId: 1 }, { unique: true });
categorySchema.index({ userId: 1, normalizedName: 1 });

export type CategoryDoc = InferSchemaType<typeof categorySchema> & { _id: mongoose.Types.ObjectId; createdAt: Date; updatedAt: Date };
export const Category = mongoose.model("Category", categorySchema);

const metadataSchema = new Schema({
  title: String,
  description: String,
  imageUrl: String,
  faviconUrl: String,
  siteName: String,
  author: String
}, { _id: false });

const resourceSchema = new Schema({
  userId: { type: String, required: true, index: true },
  ownerId: { type: String, required: true },
  type: { type: String, required: true, enum: ["link", "note", "image", "pdf"] },
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  aiDescription: { type: String },
  categoryId: { type: String, required: true },
  url: String,
  noteBody: String,
  fileName: String,
  fileSize: Number,
  contentType: String,
  storagePath: String,
  downloadUrl: String,
  metadata: metadataSchema,
  favorite: { type: Boolean, default: false },
  archived: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },
  intentType: { type: String, enum: ["unclassified", "knowledge", "mission"], default: "unclassified" },
  actionStatus: { type: String, enum: ["saved", "reviewed", "in_progress", "applied", "completed", "dormant", "archived"], default: "saved" },
  lastViewedAt: { type: Date, default: null },
  viewCount: { type: Number, default: 0 },
  tags: { type: [String], default: [] },
  lastStatusChangeAt: { type: Date, default: null },
  targetDate: { type: Date, default: null },
  milestones: { type: [{ id: String, text: String, completed: { type: Boolean, default: false } }], default: [] },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

resourceSchema.index({ userId: 1, createdAt: -1 });
resourceSchema.index({ deletedAt: 1 });
resourceSchema.index({ userId: 1, intentType: 1 });
resourceSchema.index({ userId: 1, actionStatus: 1 });
resourceSchema.index({ userId: 1, lastViewedAt: 1 });
resourceSchema.index({ userId: 1, tags: 1 });

export type ResourceDoc = InferSchemaType<typeof resourceSchema> & { _id: mongoose.Types.ObjectId; createdAt: Date; updatedAt: Date };
export const Resource = mongoose.model("Resource", resourceSchema);

export * from "./EventLog.js";
