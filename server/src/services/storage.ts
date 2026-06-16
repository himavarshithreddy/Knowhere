import { storageBucket } from "../firebase.js";

export function resourceStoragePath(userId: string, resourceId: string, fileName: string) {
  return `users/${userId}/resources/${resourceId}/${fileName}`;
}

export function resourceDownloadUrl(storagePath: string) {
  return `/api/files/${storagePath.replace(/\\/g, "/")}`;
}

function normalizeStoragePath(storagePath: string) {
  return storagePath.replace(/\\/g, "/");
}

export async function saveUploadedFile(
  userId: string,
  resourceId: string,
  fileName: string,
  buffer: Buffer,
  contentType?: string
) {
  const storagePath = resourceStoragePath(userId, resourceId, fileName);
  const file = storageBucket().file(storagePath);
  await file.save(buffer, {
    resumable: false,
    metadata: contentType ? { contentType } : undefined
  });
  return { storagePath, downloadUrl: resourceDownloadUrl(storagePath) };
}

export async function deleteStoredFile(storagePath?: string | null) {
  if (!storagePath) return;
  await storageBucket()
    .file(normalizeStoragePath(storagePath))
    .delete({ ignoreNotFound: true });
}

export async function deleteUserFiles(userId: string) {
  const [files] = await storageBucket().getFiles({ prefix: `users/${userId}/` });
  await Promise.all(files.map((file) => file.delete({ ignoreNotFound: true })));
}

export function openStoredFile(storagePath: string) {
  return storageBucket().file(normalizeStoragePath(storagePath));
}
