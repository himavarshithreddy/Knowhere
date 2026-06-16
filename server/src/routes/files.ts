import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { openStoredFile } from "../services/storage.js";

export const filesRouter = Router();
filesRouter.use(requireAuth);

filesRouter.get("/*", async (req, res) => {
  const storagePath = req.path.replace(/^\//, "");
  if (!storagePath.startsWith(`users/${req.auth!.uid}/`)) {
    return res.status(403).json({ error: "Forbidden." });
  }

  try {
    const file = openStoredFile(storagePath);
    const [exists] = await file.exists();
    if (!exists) return res.status(404).json({ error: "File not found." });

    const [metadata] = await file.getMetadata();
    if (metadata.contentType) res.setHeader("Content-Type", metadata.contentType);
    if (metadata.size) res.setHeader("Content-Length", String(metadata.size));
    if (metadata.contentType === "application/pdf") {
      res.setHeader("Content-Disposition", "inline");
    }

    file
      .createReadStream()
      .on("error", () => {
        if (!res.headersSent) res.status(404).json({ error: "File not found." });
        else res.end();
      })
      .pipe(res);
  } catch {
    res.status(404).json({ error: "File not found." });
  }
});
