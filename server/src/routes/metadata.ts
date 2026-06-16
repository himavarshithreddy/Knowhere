import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { extractMetadata } from "../services/metadata.js";

export const metadataRouter = Router();
metadataRouter.use(requireAuth);

metadataRouter.post("/extract", async (req, res) => {
  const rawUrl = String(req.body.url ?? "");
  if (!rawUrl) return res.status(400).json({ error: "URL is required." });
  try {
    const metadata = await extractMetadata(rawUrl);
    res.json(metadata);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid URL." });
  }
});
