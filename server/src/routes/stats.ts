import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Resource, type ResourceDoc, SearchEvent } from "../models/index.js";

import { getAdvancedAnalytics } from "../services/analytics.js";

export const statsRouter = Router();
statsRouter.use(requireAuth);

statsRouter.get("/", async (req, res) => {
  const userId = req.auth!.uid;
  const stats = await getAdvancedAnalytics(userId);
  res.json(stats);
});

statsRouter.post("/search", async (req, res) => {
  const userId = req.auth!.uid;
  const { query, resultsCount } = req.body;
  
  if (query && typeof query === "string" && query.trim().length > 0) {
    await SearchEvent.create({
      userId,
      query: query.trim(),
      resultsCount: typeof resultsCount === "number" ? resultsCount : 0
    }).catch(console.error);
  }
  
  res.json({ ok: true });
});
