import { randomUUID } from "node:crypto";
import { Router } from "express";
import { normalizeCategoryName } from "@knowhere/shared";
import { requireAuth } from "../middleware/auth.js";
import { Category, Resource } from "../models/index.js";
import { categoryToApi } from "../utils/serialize.js";

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

categoriesRouter.get("/", async (req, res) => {
  const categories = await Category.find({ userId: req.auth!.uid }).sort({ order: 1 });
  res.json(categories.map(categoryToApi));
});

categoriesRouter.post("/", async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "Category name is required." });

  const normalizedName = normalizeCategoryName(name);
  const existing = await Category.findOne({ userId: req.auth!.uid, normalizedName });
  if (existing) return res.status(409).json({ error: "That category already exists." });

  const count = await Category.countDocuments({ userId: req.auth!.uid });
  const category = await Category.create({
    categoryId: randomUUID(),
    userId: req.auth!.uid,
    name,
    normalizedName,
    order: count,
    isDefault: false
  });
  res.status(201).json(categoryToApi(category));
});

categoriesRouter.patch("/reorder", async (req, res) => {
  const order = req.body.order as string[] | undefined;
  if (!Array.isArray(order)) return res.status(400).json({ error: "order must be an array of category ids." });

  const categories = await Category.find({ userId: req.auth!.uid });
  const byId = new Map(categories.map((category) => [category.categoryId, category]));
  await Promise.all(order.map((categoryId, index) => {
    const category = byId.get(categoryId);
    if (!category) return Promise.resolve();
    category.order = index;
    return category.save();
  }));

  const next = await Category.find({ userId: req.auth!.uid }).sort({ order: 1 });
  res.json(next.map(categoryToApi));
});

categoriesRouter.patch("/:id", async (req, res) => {
  const category = await Category.findOne({ userId: req.auth!.uid, categoryId: req.params.id });
  if (!category) return res.status(404).json({ error: "Category not found." });
  if (category.isDefault) return res.status(400).json({ error: "General cannot be renamed." });

  const name = String(req.body.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "Category name is required." });
  const normalizedName = normalizeCategoryName(name);
  const duplicate = await Category.findOne({
    userId: req.auth!.uid,
    normalizedName,
    categoryId: { $ne: category.categoryId }
  });
  if (duplicate) return res.status(409).json({ error: "That category already exists." });

  category.name = name;
  category.normalizedName = normalizedName;
  await category.save();
  res.json(categoryToApi(category));
});

categoriesRouter.delete("/:id", async (req, res) => {
  const categoryId = req.params.id;
  const destinationId = String(req.body.destinationId ?? "");
  if (!destinationId || categoryId === destinationId) {
    return res.status(400).json({ error: "Choose a different destination category." });
  }

  const [category, destination] = await Promise.all([
    Category.findOne({ userId: req.auth!.uid, categoryId }),
    Category.findOne({ userId: req.auth!.uid, categoryId: destinationId })
  ]);
  if (!category || !destination) return res.status(404).json({ error: "Category not found." });
  if (category.isDefault) return res.status(400).json({ error: "General cannot be deleted." });

  await Resource.updateMany(
    { userId: req.auth!.uid, categoryId },
    { $set: { categoryId: destinationId } }
  );
  await category.deleteOne();
  res.json({ ok: true });
});
