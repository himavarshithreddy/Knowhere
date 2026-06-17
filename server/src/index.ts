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
import { accountRouter } from "./routes/account.js";
import { authRouter } from "./routes/auth.js";
import { coordsAuthRouter } from "./routes/coordsAuth.js";
import { categoriesRouter } from "./routes/categories.js";
import { exportRouter } from "./routes/export.js";
import { filesRouter } from "./routes/files.js";
import { meRouter } from "./routes/me.js";
import { metadataRouter } from "./routes/metadata.js";
import { resourcesRouter } from "./routes/resources.js";
import { vaultRouter } from "./routes/vault.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  assertAuthConfig();
  initFirebase();
  await connectDb();

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
  app.use("/api/resources", resourcesRouter);
  app.use("/api/metadata", metadataRouter);
  app.use("/api/export", exportRouter);
  app.use("/api/files", filesRouter);
  app.use("/api/account", accountRouter);
  app.use("/api/vault", vaultRouter);

  if (config.nodeEnv === "production") {
    const dist = path.join(__dirname, "../../web/dist");
    app.use(express.static(dist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(dist, "index.html"));
    });
  }

  startPurgeTrashJob();
  app.listen(config.port, () => {
    console.log(`Knowhere server listening on http://localhost:${config.port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
