import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import compression from "compression";
import express from "express";
import { assertAuthConfig, config } from "./config.js";
import { connectDb } from "./db.js";
import { initFirebase } from "./firebase.js";
import { startPurgeTrashJob } from "./jobs/purgeTrash.js";
import { startAgingJob } from "./jobs/aging.js";
import { startPushCron } from "./services/pushCron.js";
import { accountRouter } from "./routes/account.js";
import { authRouter } from "./routes/auth.js";
import { coordsAuthRouter } from "./routes/coordsAuth.js";
import { categoriesRouter } from "./routes/categories.js";
import { exportRouter } from "./routes/export.js";
import { filesRouter } from "./routes/files.js";
import { interestsRouter } from "./routes/interests.js";
import { meRouter } from "./routes/me.js";
import { metadataRouter } from "./routes/metadata.js";
import { rediscoveryRouter } from "./routes/rediscovery.js";
import { resourcesRouter } from "./routes/resources.js";
import { statsRouter } from "./routes/stats.js";
import { vaultRouter } from "./routes/vault.js";
import { pushRouter } from "./routes/push.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  assertAuthConfig();
  initFirebase();
  try {
    await connectDb();
  } catch (error) {
    console.error("\n[ERROR] DATABASE CONNECTION ERROR:");
    console.error(error);
    console.error("\nTroubleshooting Tips:");
    console.error("1. If using MongoDB Atlas, verify your current IP address is whitelisted in the Atlas console (Network Access).");
    console.error("2. Check if your internet connection is active.");
    console.error("3. If you want to use a local MongoDB instance instead, update MONGODB_URI in `server/.env` to: `mongodb://localhost:27017/knowhere`\n");
    process.exit(1);
  }

  const app = express();
  app.use(compression() as never);
  app.use(cors({ origin: config.clientUrl, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser() as never);

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/auth/coords", coordsAuthRouter);
  app.use("/api/me", meRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/interests", interestsRouter);
  app.use("/api/resources", resourcesRouter);
  app.use("/api/rediscovery", rediscoveryRouter);
  app.use("/api/stats", statsRouter);
  app.use("/api/metadata", metadataRouter);
  app.use("/api/export", exportRouter);
  app.use("/api/files", filesRouter);
  app.use("/api/account", accountRouter);
  app.use("/api/vault", vaultRouter);
  app.use("/api/push", pushRouter);

  if (config.nodeEnv === "production") {
    const dist = path.join(__dirname, "../../web/dist");
    app.use(express.static(dist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(dist, "index.html"));
    });
  }

  startPurgeTrashJob();
  startAgingJob();
  startPushCron();
  
  app.listen(config.port, () => {
    console.log(`Knowhere server listening on http://localhost:${config.port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
