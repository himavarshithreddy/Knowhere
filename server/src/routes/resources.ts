import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { allowedUploadTypes, MAX_UPLOAD_BYTES } from "@knowhere/shared";
import { requireAuth } from "../middleware/auth.js";
import { Resource, User } from "../models/index.js";
import { deleteStoredFile, saveUploadedFile } from "../services/storage.js";
import { resourceToApi } from "../utils/serialize.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!allowedUploadTypes.includes(file.mimetype as typeof allowedUploadTypes[number])) {
      cb(new Error("Choose a JPEG, PNG, WebP, GIF, or PDF file."));
      return;
    }
    cb(null, true);
  }
});

export const resourcesRouter = Router();
resourcesRouter.use(requireAuth);

resourcesRouter.get("/", async (req, res) => {
  const resources = await Resource.find({ userId: req.auth!.uid }).sort({ createdAt: -1 });
  res.json(resources.map(resourceToApi));
});

resourcesRouter.post("/", async (req, res) => {
  const { type, title, description, categoryId, url, noteBody, metadata, locked } = req.body;
  if (!type || !description?.trim() || !categoryId) {
    return res.status(400).json({ error: "Add a description and category." });
  }
  if (type === "link" && !url?.trim()) {
    return res.status(400).json({ error: "Add a URL." });
  }
  if (type !== "link" && !String(title ?? "").trim()) {
    return res.status(400).json({ error: "Add a title, description, and category." });
  }

  const resource = await Resource.create({
    userId: req.auth!.uid,
    ownerId: req.auth!.uid,
    type,
    title: String(title ?? metadata?.title ?? "").trim(),
    description: String(description).trim(),
    categoryId,
    url: url ?? undefined,
    noteBody: noteBody ?? undefined,
    metadata: metadata ?? undefined,
    favorite: false,
    archived: false,
    locked: locked === true,
    deletedAt: null
  });

  await User.updateOne(
    { uid: req.auth!.uid },
    { $set: { "preferences.lastCategoryId": categoryId } }
  );

  res.status(201).json(resourceToApi(resource));
});

resourcesRouter.post("/:id/upload", upload.single("file") as never, async (req, res) => {
  const resource = await Resource.findOne({ _id: req.params.id, userId: req.auth!.uid });
  if (!resource) return res.status(404).json({ error: "Resource not found." });
  if (!req.file) return res.status(400).json({ error: "Choose a file." });

  try {
    const { storagePath, downloadUrl } = await saveUploadedFile(
      req.auth!.uid,
      resource._id.toString(),
      req.file.originalname,
      req.file.buffer,
      req.file.mimetype
    );
    resource.storagePath = storagePath;
    resource.downloadUrl = downloadUrl;
    resource.fileName = req.file.originalname;
    resource.fileSize = req.file.size;
    resource.contentType = req.file.mimetype;
    await resource.save();
    res.json(resourceToApi(resource));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Upload failed." });
  }
});

resourcesRouter.patch("/:id", async (req, res) => {
  const resource = await Resource.findOne({ _id: req.params.id, userId: req.auth!.uid });
  if (!resource) return res.status(404).json({ error: "Resource not found." });

  const allowed = ["title", "description", "categoryId", "url", "noteBody", "metadata", "favorite", "archived", "locked", "deletedAt"] as const;
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      if (key === "deletedAt") {
        resource.deletedAt = req.body.deletedAt ? new Date(req.body.deletedAt) : null;
      } else if (key === "title") resource.title = req.body.title;
      else if (key === "description") resource.description = req.body.description;
      else if (key === "categoryId") resource.categoryId = req.body.categoryId;
      else if (key === "url") resource.url = req.body.url;
      else if (key === "noteBody") resource.noteBody = req.body.noteBody;
      else if (key === "metadata") resource.metadata = req.body.metadata;
      else if (key === "favorite") resource.favorite = req.body.favorite;
      else if (key === "archived") resource.archived = req.body.archived;
      else if (key === "locked") resource.locked = req.body.locked;
    }
  }

  await resource.save();
  res.json(resourceToApi(resource));
});

resourcesRouter.delete("/:id", async (req, res) => {
  const resource = await Resource.findOne({ _id: req.params.id, userId: req.auth!.uid });
  if (!resource) return res.status(404).json({ error: "Resource not found." });
  await deleteStoredFile(resource.storagePath);
  await resource.deleteOne();
  res.json({ ok: true });
});

resourcesRouter.use((error: Error, _req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "Files must be 25 MB or smaller." });
  }
  if (error) return res.status(400).json({ error: error.message });
  next();
});
