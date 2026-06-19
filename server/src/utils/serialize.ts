import type { Category, Resource, UserProfile } from "@knowhere/shared";
import type { CategoryDoc, ResourceDoc, UserDoc } from "../models/index.js";

const optional = <T>(value: T | null | undefined) => value ?? undefined;

export const toIso = (value?: Date | string | null) => {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
};

export const userToProfile = (user: UserDoc): UserProfile => ({
  uid: user.uid,
  displayName: user.displayName,
  email: user.email,
  photoURL: user.photoURL ?? null,
  onboardingComplete: user.onboardingComplete,
  hasVaultPin: Boolean(user.vaultPin),
  preferences: {
    density: (user.preferences?.density ?? "comfortable") as UserProfile["preferences"]["density"],
    view: (user.preferences?.view ?? "grid") as UserProfile["preferences"]["view"],
    lastCategoryId: user.preferences?.lastCategoryId ?? undefined
  },
  createdAt: toIso(user.createdAt)!,
  updatedAt: toIso(user.updatedAt)!
});

export const categoryToApi = (doc: CategoryDoc): Category => ({
  id: doc.categoryId,
  name: doc.name,
  normalizedName: doc.normalizedName,
  order: doc.order,
  isDefault: doc.isDefault,
  createdAt: toIso(doc.createdAt)!,
  updatedAt: toIso(doc.updatedAt)!
});

export const resourceToApi = (doc: ResourceDoc): Resource => ({
  id: doc._id.toString(),
  ownerId: doc.ownerId,
  type: doc.type as Resource["type"],
  title: doc.title,
  description: doc.description,
  aiDescription: optional((doc as any).aiDescription),
  categoryId: doc.categoryId,
  url: optional(doc.url),
  noteBody: optional(doc.noteBody),
  fileName: optional(doc.fileName),
  fileSize: optional(doc.fileSize),
  contentType: optional(doc.contentType),
  storagePath: optional(doc.storagePath),
  downloadUrl: optional(doc.downloadUrl),
  metadata: doc.metadata ? {
    title: optional(doc.metadata.title),
    description: optional(doc.metadata.description),
    imageUrl: optional(doc.metadata.imageUrl),
    faviconUrl: optional(doc.metadata.faviconUrl),
    siteName: optional(doc.metadata.siteName),
    author: optional(doc.metadata.author)
  } : undefined,
  favorite: doc.favorite,
  archived: doc.archived,
  locked: doc.locked,
  intentType: doc.intentType as Resource["intentType"],
  actionStatus: doc.actionStatus as Resource["actionStatus"],
  lastViewedAt: toIso(doc.lastViewedAt),
  viewCount: doc.viewCount,
  tags: doc.tags,
  lastStatusChangeAt: toIso(doc.lastStatusChangeAt),
  targetDate: toIso((doc as any).targetDate),
  milestones: ((doc as any).milestones ?? []).map((m: any) => ({ id: m.id || m._id?.toString() || '', text: m.text, completed: m.completed })),
  deletedAt: toIso(doc.deletedAt),
  createdAt: toIso(doc.createdAt)!,
  updatedAt: toIso(doc.updatedAt)!
});
