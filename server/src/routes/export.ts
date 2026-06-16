import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Category, Resource, User } from "../models/index.js";
import { resourcesToCsv } from "../utils/export.js";
import { categoryToApi, resourceToApi, userToProfile } from "../utils/serialize.js";

export const exportRouter = Router();
exportRouter.use(requireAuth);

exportRouter.get("/", async (req, res) => {
  const format = req.query.format === "csv" ? "csv" : "json";
  const uid = req.auth!.uid;
  const [resources, categories, user] = await Promise.all([
    Resource.find({ userId: uid }).sort({ createdAt: -1 }),
    Category.find({ userId: uid }).sort({ order: 1 }),
    User.findOne({ uid })
  ]);

  const resourceRows = resources.map(resourceToApi);
  const categoryRows = categories.map(categoryToApi);

  if (format === "csv") {
    return res.json({
      format,
      content: resourcesToCsv(resourceRows, categoryRows)
    });
  }

  res.json({
    format,
    content: JSON.stringify({
      exportedAt: new Date().toISOString(),
      profile: user ? userToProfile(user) : null,
      categories: categoryRows,
      resources: resourceRows
    }, null, 2)
  });
});
