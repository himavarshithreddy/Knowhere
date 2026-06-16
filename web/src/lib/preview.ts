import type { ExtractedMetadata, Resource } from "@knowhere/shared";

export function isProfilePreviewImage(imageUrl?: string) {
  if (!imageUrl) return false;
  const lower = imageUrl.toLowerCase();
  return lower.includes("profile_images")
    || lower.includes("profile-displayphoto")
    || /pbs\.twimg\.com\/profile_images\//i.test(imageUrl)
    || /licdn\.com.*profile-displayphoto/i.test(imageUrl);
}

export function isXStatusUrl(rawUrl?: string) {
  if (!rawUrl) return false;
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "");
    if (!["x.com", "twitter.com", "mobile.twitter.com"].includes(host)) return false;
    return /\/status\/\d+/i.test(url.pathname);
  } catch {
    return false;
  }
}

export function isLinkedInPostUrl(rawUrl?: string) {
  if (!rawUrl) return false;
  try {
    const url = new URL(rawUrl);
    if (!url.hostname.includes("linkedin.com")) return false;
    return /\/(posts|feed\/update|pulse)\//i.test(url.pathname)
      || url.pathname.includes("/activity-");
  } catch {
    return false;
  }
}

export function isSocialPostUrl(rawUrl?: string) {
  return isXStatusUrl(rawUrl) || isLinkedInPostUrl(rawUrl);
}

export function metadataPreviewImage(metadata?: ExtractedMetadata, pageUrl?: string) {
  if (!metadata?.imageUrl || isProfilePreviewImage(metadata.imageUrl)) return undefined;
  if (pageUrl && isXStatusUrl(pageUrl)) return undefined;
  if (pageUrl && isLinkedInPostUrl(pageUrl) && isProfilePreviewImage(metadata.imageUrl)) return undefined;
  return metadata.imageUrl;
}

export function metadataPreviewText(metadata?: ExtractedMetadata, pageUrl?: string) {
  const description = metadata?.description?.trim();
  if (!description) return undefined;
  if (pageUrl && isSocialPostUrl(pageUrl)) return description;
  return undefined;
}

export function resourcePreviewUrl(resource: Resource) {
  if (resource.type === "image" && resource.downloadUrl) return resource.downloadUrl;
  return metadataPreviewImage(resource.metadata, resource.url);
}

export function resourcePreviewText(resource: Resource) {
  if (resource.type === "note" && resource.noteBody?.trim()) {
    return resource.noteBody.trim().split("\n").find((line) => line.trim())?.trim();
  }
  return metadataPreviewText(resource.metadata, resource.url)
    ?? resource.metadata?.description?.trim();
}
