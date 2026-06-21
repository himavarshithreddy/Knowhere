import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "../.env") });

export const config = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  mongoUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/knowhere",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-in-production",
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT ?? "",
  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? "",
  coordsPepper: process.env.COORDS_PEPPER ?? process.env.ACCESS_CODE_PEPPER ?? process.env.JWT_SECRET ?? "dev-only-change-in-production",
  firebaseStorageBucket: (process.env.FIREBASE_STORAGE_BUCKET ?? "knowhere-30ac9.firebasestorage.app").replace(/^gs:\/\//, ""),
  openRouterKey: process.env.OPENROUTER_KEY ?? "",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  vapidSubject: process.env.VAPID_SUBJECT ?? ""
};

export const assertAuthConfig = () => {
  if (!config.firebaseServiceAccountJson && !config.firebaseServiceAccountPath) {
    throw new Error("Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT for Firebase Auth.");
  }
  if (config.nodeEnv === "production" && config.jwtSecret === "dev-only-change-in-production") {
    throw new Error("Set JWT_SECRET in production.");
  }
};
