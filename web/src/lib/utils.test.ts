import { describe, expect, it } from "vitest";
import type { Resource } from "@knowhere/shared";
import { searchResources } from "./utils";

const resource = {
  id: "1", ownerId: "u", type: "link" as const, title: "Deep work", description: "Read for focus",
  categoryId: "c", favorite: false, archived: false, locked: false, deletedAt: null,
  createdAt: "", updatedAt: ""
} as any as Resource;
const categories = [{ id: "c", name: "Reading", normalizedName: "reading", order: 0, isDefault: false, createdAt: "", updatedAt: "" }];

describe("searchResources", () => {
  it("searches category and description", () => {
    expect(searchResources([resource], "reading", categories)).toHaveLength(1);
    expect(searchResources([resource], "focus", categories)).toHaveLength(1);
    expect(searchResources([resource], "missing", categories)).toHaveLength(0);
  });
});
