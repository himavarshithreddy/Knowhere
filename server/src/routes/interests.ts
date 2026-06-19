import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getInterestMap, getRelatedResources } from "../services/interests.js";
import { resourceToApi } from "../utils/serialize.js";
import { Resource, type ResourceDoc } from "../models/index.js";

export const interestsRouter = Router();
interestsRouter.use(requireAuth);

interestsRouter.get("/", async (req, res) => {
  const clusters = await getInterestMap(req.auth!.uid);
  res.json({ interests: clusters });
});

interestsRouter.get("/:id/related", async (req, res) => {
  const resource = await Resource.findOne({ _id: req.params.id, userId: req.auth!.uid }).lean() as ResourceDoc;
  if (!resource) return res.status(404).json({ error: "Not found" });

  const related = await getRelatedResources(req.auth!.uid, resource.tags || [], req.params.id);
  res.json({ related: related.map(r => resourceToApi(r as ResourceDoc)) });
});
