import type { DecodedIdToken } from "firebase-admin/auth";
import { Category, User } from "../models/index.js";
import { coordsLookup, createCoordsUserId, hashCoords } from "./coords.js";

const coordsProviders = ["code", "coords"] as const;

export async function createDefaultCategories(userId: string) {
  await Category.create({
    categoryId: "general",
    userId,
    name: "General",
    normalizedName: "general",
    order: 0,
    isDefault: true
  });
}

export async function bootstrapGoogleUser(token: DecodedIdToken) {
  const uid = token.uid;
  const existing = await User.findOne({ uid });
  if (existing) {
    existing.displayName = token.name ?? existing.displayName;
    existing.email = token.email ?? existing.email;
    existing.photoURL = token.picture ?? existing.photoURL;
    await existing.save();
    return existing;
  }

  const user = await User.create({
    uid,
    authProvider: "google",
    displayName: token.name ?? "Traveler",
    email: token.email ?? "",
    photoURL: token.picture ?? null,
    onboardingComplete: false,
    preferences: { density: "comfortable", view: "grid", lastCategoryId: "general" }
  });

  await createDefaultCategories(uid);
  return user;
}

export async function createCoordsUser(coords: string, email: string, firebaseUid: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const lookup = coordsLookup(coords);
  const existingCoords = await User.findOne({ accessCodeLookup: lookup });
  if (existingCoords) throw new Error("Those Coords are already claimed. Try another pair.");

  const existingEmail = await User.findOne({ email: normalizedEmail, authProvider: { $in: coordsProviders } });
  if (existingEmail) throw new Error("An account with this email already exists. Recover your Coords instead.");

  const uid = createCoordsUserId();
  const user = await User.create({
    uid,
    authProvider: "coords",
    firebaseUid,
    accessCodeLookup: lookup,
    accessCodeHash: await hashCoords(coords),
    displayName: coords,
    email: normalizedEmail,
    photoURL: null,
    onboardingComplete: false,
    preferences: { density: "comfortable", view: "grid", lastCategoryId: "general" }
  });

  await createDefaultCategories(uid);
  return user;
}
