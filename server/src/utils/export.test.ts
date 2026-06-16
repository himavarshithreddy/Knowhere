import { describe, expect, it } from "vitest";
import { resourcesToCsv } from "./export.js";

describe("resourcesToCsv", () => {
  it("escapes quotes and resolves category names", () => {
    const csv = resourcesToCsv([{
      id: "r1", ownerId: "u", type: "note", title: 'A "note"', description: "Why",
      categoryId: "c1", favorite: false, archived: false, deletedAt: null,
      createdAt: "2026-01-01", updatedAt: "2026-01-01"
    }], [{ id: "c1", name: "General", normalizedName: "general", order: 0, isDefault: true, createdAt: "", updatedAt: "" }]);
    expect(csv).toContain('"A ""note"""');
    expect(csv).toContain('"General"');
  });
});
