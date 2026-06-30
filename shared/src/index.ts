import { z } from "zod";

export const resourceTypeSchema = z.enum(["link", "note", "image", "pdf"]);
export const densitySchema = z.enum(["comfortable", "compact"]);

export const intentTypeSchema = z.enum(["unclassified", "knowledge", "mission"]);
export const actionStatusSchema = z.enum(["saved", "reviewed", "in_progress", "applied", "completed", "dormant", "archived"]);

export const metadataSchema = z.object({
  title: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  siteName: z.string().max(200).optional(),
  author: z.string().max(200).optional(),
  caption: z.string().optional(),
  tags: z.array(z.string()).optional(),
  content: z.string().optional()
});

export const resourceSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  type: resourceTypeSchema,
  title: z.string().max(500),
  description: z.string().trim().max(2000).optional().default(""),
  aiDescription: z.string().max(2000).optional(),
  categoryId: z.string().min(1),
  url: z.string().url().optional(),
  noteBody: z.string().max(100000).optional(),
  fileName: z.string().max(500).optional(),
  fileSize: z.number().nonnegative().optional(),
  contentType: z.string().optional(),
  storagePath: z.string().optional(),
  downloadUrl: z.string().optional(),
  metadata: metadataSchema.optional(),
  favorite: z.boolean().default(false),
  archived: z.boolean().default(false),
  locked: z.boolean().default(false),
  intentType: intentTypeSchema.default("unclassified"),
  actionStatus: actionStatusSchema.default("saved"),
  lastViewedAt: z.string().nullable().default(null),
  viewCount: z.number().int().nonnegative().default(0),
  tags: z.array(z.string()).default([]),
  lastStatusChangeAt: z.string().nullable().default(null),
  targetDate: z.string().nullable().optional().default(null),
  remindAt: z.string().nullable().optional().default(null),
  milestones: z.array(z.object({
    id: z.string(),
    text: z.string().max(200),
    completed: z.boolean()
  })).default([]),
  deletedAt: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const categorySchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(80),
  normalizedName: z.string(),
  order: z.number().int().nonnegative(),
  isDefault: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const preferencesSchema = z.object({
  density: densitySchema.default("comfortable"),
  view: z.enum(["grid", "list", "detail"]).default("grid"),
  lastCategoryId: z.string().optional()
});

export const userProfileSchema = z.object({
  uid: z.string(),
  displayName: z.string(),
  email: z.string().email(),
  photoURL: z.string().url().nullable(),
  onboardingComplete: z.boolean(),
  hasVaultPin: z.boolean().default(false),
  preferences: preferencesSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});

export type Resource = z.infer<typeof resourceSchema>;
export type ResourceType = z.infer<typeof resourceTypeSchema>;
export type IntentType = z.infer<typeof intentTypeSchema>;
export type ActionStatus = z.infer<typeof actionStatusSchema>;
export type Category = z.infer<typeof categorySchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type UserPreferences = z.infer<typeof preferencesSchema>;
export type ExtractedMetadata = z.infer<typeof metadataSchema>;

export const normalizeCategoryName = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase();

export const allowedUploadTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf"
] as const;

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const COORDS_PATTERN = /^[A-Z]{2}-\d{4}$/;

const COORDS_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const COORDS_DIGITS = "0123456789";

const pickRandom = (chars: string, count: number) => {
  const values = new Uint8Array(count);
  globalThis.crypto.getRandomValues(values);
  return Array.from(values, (value) => chars[value % chars.length]).join("");
};

export const generateCoords = () => `${pickRandom(COORDS_LETTERS, 2)}-${pickRandom(COORDS_DIGITS, 4)}`;

export const generateCoordsSuggestions = (count = 4) => {
  const seen = new Set<string>();
  const suggestions: string[] = [];
  while (suggestions.length < count) {
    const coords = generateCoords();
    if (seen.has(coords)) continue;
    seen.add(coords);
    suggestions.push(coords);
  }
  return suggestions;
};

export const normalizeCoords = (value: string) => {
  const raw = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (raw.length !== 6) return null;
  const coords = `${raw.slice(0, 2)}-${raw.slice(2)}`;
  return COORDS_PATTERN.test(coords) ? coords : null;
};

export const formatCoordsInput = (value: string) => {
  const raw = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
  if (raw.length <= 2) return raw;
  return `${raw.slice(0, 2)}-${raw.slice(2)}`;
};

/** @deprecated use normalizeCoords */
export const normalizeAccessCode = normalizeCoords;
/** @deprecated use formatCoordsInput */
export const formatAccessCodeInput = formatCoordsInput;
/** @deprecated use COORDS_PATTERN */
export const ACCESS_CODE_PATTERN = COORDS_PATTERN;
