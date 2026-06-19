import type { Category, Resource } from "@knowhere/shared";

export const hydrateResource = (resource: Resource): Resource => ({
  ...resource,
  deletedAt: resource.deletedAt ?? null
});

export const hydrateCategory = (category: Category): Category => category;

export function resourceDisplayTitle(resource: Resource) {
  const fetched = resource.title?.trim() || resource.metadata?.title?.trim();
  if (fetched) return fetched;
  if (resource.type === "link" && resource.url) {
    try { return new URL(resource.url).hostname.replace(/^www\./, ""); } catch { return resource.url; }
  }
  if (resource.fileName) return resource.fileName.replace(/\.[^.]+$/, "");
  const noteLine = resource.noteBody?.trim().split("\n").find((line) => line.trim());
  if (noteLine) return noteLine.trim().slice(0, 120);
  return "Untitled";
}

export function searchResources(resources: Resource[], query: string, categories: Category[]) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return resources;
  const names = new Map(categories.map((category) => [category.id, category.name]));
  return resources.filter((resource) => {
    const fields = [
      resource.title, resource.metadata?.title, resource.description, resource.aiDescription, resource.url, resource.fileName,
      resource.noteBody, names.get(resource.categoryId), resource.metadata?.siteName,
      resource.metadata?.author, resource.intentType, resource.actionStatus
    ];
    if (fields.some((value) => value?.toLocaleLowerCase().includes(needle))) return true;
    // Also search through tags array
    return (resource.tags ?? []).some((tag) => tag.toLocaleLowerCase().includes(needle));
  });
}

export const relativeDate = (iso: string) => {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (Math.abs(days) < 1) return "today";
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(days, "day");
};

export function categoryHue(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}
