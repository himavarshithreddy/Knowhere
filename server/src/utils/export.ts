import type { Category, Resource } from "@knowhere/shared";

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function resourcesToCsv(resources: Resource[], categories: Category[]) {
  const names = new Map(categories.map((category) => [category.id, category.name]));
  const headings = ["id", "type", "title", "description", "category", "url", "fileName", "favorite", "archived", "deletedAt", "createdAt", "updatedAt"];
  const rows = resources.map((resource) => [
    resource.id, resource.type, resource.title, resource.description,
    names.get(resource.categoryId) ?? "", resource.url, resource.fileName,
    resource.favorite, resource.archived, resource.deletedAt,
    resource.createdAt, resource.updatedAt
  ]);
  return [headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
