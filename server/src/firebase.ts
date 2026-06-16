import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { config } from "./config.js";

export function initFirebase() {
  if (getApps().length) return;

  const options = { storageBucket: config.firebaseStorageBucket };

  if (config.firebaseServiceAccountPath) {
    const json = readFileSync(config.firebaseServiceAccountPath, "utf8");
    initializeApp({ credential: cert(JSON.parse(json)), ...options });
    return;
  }

  if (config.firebaseServiceAccountJson) {
    initializeApp({ credential: cert(JSON.parse(config.firebaseServiceAccountJson)), ...options });
    return;
  }

  throw new Error("Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT for Firebase Auth verification.");
}

export const firebaseAuth = () => getAuth();
export const firebaseDb = () => getFirestore();
export const firebaseStorage = () => getStorage();
export const storageBucket = () => firebaseStorage().bucket(config.firebaseStorageBucket);
