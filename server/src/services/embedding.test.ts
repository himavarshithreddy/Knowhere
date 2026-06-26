import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateEmbedding, generateResourceEmbedding } from "./embedding.js";
import { Resource } from "../models/index.js";

// Mock the openRouterKey so the AI client initializes
vi.mock("../config.js", () => ({
  config: {
    openRouterKey: "fake-key",
    embeddingModel: "fake-model"
  }
}));

// Mock openai
const { mockCreate } = vi.hoisted(() => {
  return {
    mockCreate: vi.fn().mockResolvedValue({
      data: [{ embedding: [0.1, 0.2, 0.3] }]
    })
  };
});

vi.mock("openai", () => {
  return {
    default: class OpenAI {
      embeddings = {
        create: mockCreate
      };
    }
  };
});

describe("Embedding Service", () => {
  beforeEach(() => {
    mockCreate.mockClear();
  });

  it("should generate embedding for valid text", async () => {
    const embedding = await generateEmbedding("hello world");
    expect(embedding).toEqual([0.1, 0.2, 0.3]);
    expect(mockCreate).toHaveBeenCalledWith({
      model: "fake-model",
      input: "hello world"
    });
  });

  it("should return null for empty text", async () => {
    const embedding = await generateEmbedding("   ");
    expect(embedding).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("should handle API errors gracefully", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API limits exceeded"));
    const embedding = await generateEmbedding("error text");
    expect(embedding).toBeNull();
  });

  it("should generate embedding for a resource doc combining its fields", async () => {
    const resource = new Resource({
      title: "React Guide",
      description: "How to use react hooks",
      aiDescription: "A comprehensive guide on hooks.",
      tags: ["react", "frontend"],
      url: "https://react.dev",
      type: "link",
      categoryId: "cat1",
      userId: "user1",
      ownerId: "user1"
    });
    
    const embedding = await generateResourceEmbedding(resource as any);
    expect(embedding).toEqual([0.1, 0.2, 0.3]);
    
    // Check if the input contains all the fields concatenated
    const callInput = mockCreate.mock.calls[0][0].input;
    expect(callInput).toContain("React Guide");
    expect(callInput).toContain("How to use react hooks");
    expect(callInput).toContain("A comprehensive guide");
    expect(callInput).toContain("react, frontend");
    expect(callInput).toContain("https://react.dev");
  });
});
