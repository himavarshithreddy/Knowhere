import cron from "node-cron";
import { Resource } from "../models/index.js";
import { deleteStoredFile } from "../services/storage.js";

export function startPurgeTrashJob() {
  cron.schedule("0 3 * * *", async () => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const expired = await Resource.find({ deletedAt: { $lte: cutoff } }).limit(500);
    await Promise.all(expired.map(async (resource) => {
      await deleteStoredFile(resource.storagePath);
      await resource.deleteOne();
    }));
    if (expired.length) console.log(`Purged ${expired.length} expired resources.`);
  });
}
