import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { allowedUploadTypes, MAX_UPLOAD_BYTES } from "@knowhere/shared";
import { requireAuth } from "../middleware/auth.js";
import { Resource, User, InteractionEvent } from "../models/index.js";
import { deleteStoredFile, saveUploadedFile } from "../services/storage.js";
import { resourceToApi } from "../utils/serialize.js";
import { classifyResource } from "../services/classifier.js";
import { generateResourceEmbedding } from "../services/embedding.js";

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
  const { intentType, actionStatus } = req.query;
  const filter: any = { userId: req.auth!.uid };
  if (intentType) filter.intentType = intentType;
  if (actionStatus) filter.actionStatus = actionStatus;

  const resources = await Resource.find(filter).sort({ createdAt: -1 });
  res.json(resources.map(resourceToApi));
});

resourcesRouter.post("/", async (req, res) => {
  const { type, title, description, categoryId, url, noteBody, metadata, locked, intentType } = req.body;
  if (!type || !categoryId) {
    return res.status(400).json({ error: "Add a category." });
  }
  if (type === "link" && !url?.trim()) {
    return res.status(400).json({ error: "Add a URL." });
  }
  if (type !== "link" && !String(title ?? "").trim()) {
    return res.status(400).json({ error: "Add a title and category." });
  }

  const resolvedTitle = String(title ?? metadata?.title ?? "").trim();
  const resolvedDesc = String(description ?? "").trim();
  
  const resource = await Resource.create({
    userId: req.auth!.uid,
    ownerId: req.auth!.uid,
    type,
    title: resolvedTitle,
    description: resolvedDesc,
    categoryId,
    url: url ?? undefined,
    noteBody: noteBody ?? undefined,
    metadata: metadata ?? undefined,
    favorite: false,
    archived: false,
    locked: locked === true,
    intentType: intentType && ["mission", "knowledge", "unclassified"].includes(intentType) ? intentType : "unclassified",
    actionStatus: "saved",
    tags: [],
    deletedAt: null
  });

  InteractionEvent.create({ userId: req.auth!.uid, resourceId: resource._id, type: "save" }).catch(console.error);

  // Start classification and description generation asynchronously
  (async () => {
    try {
      const classification = await classifyResource(resolvedTitle, resolvedDesc, url, metadata);
      const updatePayload: any = {
        tags: classification.tags,
        ...(classification.aiDescription ? { aiDescription: classification.aiDescription } : {})
      };
      
      // If user did not fill the description, populate it with the AI-generated summary
      if (!resolvedDesc && classification.aiDescription) {
        updatePayload.description = classification.aiDescription;
      }
      
      // Only override intent if user didn't explicitly set one
      if (!intentType || intentType === "unclassified") {
        updatePayload.intentType = classification.intentType;
      }
      
      await Resource.updateOne(
        { _id: resource._id },
        { $set: updatePayload }
      );

      // Generate vector embedding for semantic search
      const updatedResource = await Resource.findById(resource._id);
      if (updatedResource) {
        const embedding = await generateResourceEmbedding(updatedResource);
        if (embedding) {
          await Resource.updateOne({ _id: resource._id }, { $set: { embedding } });
        }
      }
    } catch (err) {
      console.error("Background classification or embedding failed:", err);
    }
  })();

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

  const allowed = ["title", "description", "categoryId", "url", "noteBody", "metadata", "favorite", "archived", "locked", "deletedAt", "intentType", "actionStatus", "tags", "targetDate", "milestones"] as const;
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      if (key === "deletedAt") {
        resource.deletedAt = req.body.deletedAt ? new Date(req.body.deletedAt) : null;
        if (req.body.deletedAt) InteractionEvent.create({ userId: req.auth!.uid, resourceId: resource._id, type: "trash" }).catch(console.error);
      } else if (key === "actionStatus" && resource.actionStatus !== req.body.actionStatus) {
        resource.actionStatus = req.body.actionStatus;
        resource.lastStatusChangeAt = new Date();
        if (req.body.actionStatus === "completed") {
          InteractionEvent.create({ userId: req.auth!.uid, resourceId: resource._id, type: "complete" }).catch(console.error);
        } else if (req.body.actionStatus === "in_progress") {
          InteractionEvent.create({ userId: req.auth!.uid, resourceId: resource._id, type: "build" }).catch(console.error);
        }
      } else if (key === "title") resource.title = req.body.title;
      else if (key === "description") resource.description = req.body.description;
      else if (key === "categoryId") resource.categoryId = req.body.categoryId;
      else if (key === "url") resource.url = req.body.url;
      else if (key === "noteBody") resource.noteBody = req.body.noteBody;
      else if (key === "metadata") resource.metadata = req.body.metadata;
      else if (key === "favorite") resource.favorite = req.body.favorite;
      else if (key === "archived") {
        resource.archived = req.body.archived;
        if (req.body.archived) InteractionEvent.create({ userId: req.auth!.uid, resourceId: resource._id, type: "archive" }).catch(console.error);
      }
      else if (key === "locked") resource.locked = req.body.locked;
      else if (key === "intentType") resource.intentType = req.body.intentType;
      else if (key === "tags") resource.tags = req.body.tags;
      else if (key === "targetDate") (resource as any).targetDate = req.body.targetDate ? new Date(req.body.targetDate) : null;
      else if (key === "milestones") (resource as any).milestones = req.body.milestones;
    }
  }

  await resource.save();
  res.json(resourceToApi(resource));

  // Background embedding update if text content changed
  const textFields = ["title", "description", "categoryId", "url", "noteBody", "tags"];
  if (textFields.some(key => req.body[key] !== undefined)) {
    generateResourceEmbedding(resource).then(embedding => {
      if (embedding) {
        Resource.updateOne({ _id: resource._id }, { $set: { embedding } }).catch(console.error);
      }
    }).catch(console.error);
  }
});

resourcesRouter.post("/:id/view", async (req, res) => {
  const resource = await Resource.findOne({ _id: req.params.id, userId: req.auth!.uid });
  if (!resource) return res.status(404).json({ error: "Resource not found." });

  resource.viewCount += 1;
  resource.lastViewedAt = new Date();
  await resource.save();

  const viewType = req.body.type || "open";
  InteractionEvent.create({ userId: req.auth!.uid, resourceId: resource._id, type: viewType }).catch(console.error);

  res.json({ ok: true, viewCount: resource.viewCount, lastViewedAt: resource.lastViewedAt });
});

resourcesRouter.delete("/trash/empty", async (req, res) => {
  const trashedResources = await Resource.find({ userId: req.auth!.uid, deletedAt: { $ne: null } });
  for (const resource of trashedResources) {
    if (resource.storagePath) {
      await deleteStoredFile(resource.storagePath).catch(console.error);
    }
  }
  await Resource.deleteMany({ userId: req.auth!.uid, deletedAt: { $ne: null } });
  res.json({ ok: true });
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
