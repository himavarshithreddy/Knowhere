import { describe, expect, it } from "vitest";
import { formatCoordsInput, generateCoordsSuggestions, normalizeCoords } from "./index.js";

describe("coords helpers", () => {
  it("normalizes valid coords", () => {
    expect(normalizeCoords("ab1234")).toBe("AB-1234");
    expect(normalizeCoords("AB-1234")).toBe("AB-1234");
  });

  it("rejects invalid coords", () => {
    expect(normalizeCoords("A-123")).toBeNull();
    expect(normalizeCoords("ABC-1234")).toBeNull();
  });

  it("formats input while typing", () => {
    expect(formatCoordsInput("ab")).toBe("AB");
    expect(formatCoordsInput("ab12")).toBe("AB-12");
  });

  it("generates unique coord suggestions", () => {
    const suggestions = generateCoordsSuggestions(4);
    expect(suggestions).toHaveLength(4);
    expect(new Set(suggestions).size).toBe(4);
    suggestions.forEach((coords) => expect(coords).toMatch(/^[A-Z]{2}-\d{4}$/));
  });
});
