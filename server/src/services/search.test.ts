import { describe, it, expect, vi, beforeEach } from "vitest";
import { keywordSearch, semanticSearch, hybridSearch } from "./search.js";
import { Resource } from "../models/index.js";
import * as embeddingModule from "./embedding.js";

vi.mock("./embedding.js", () => ({
  generateEmbedding: vi.fn()
}));

vi.mock("../models/index.js", () => {
  return {
    Resource: {
      find: vi.fn(),
      aggregate: vi.fn()
    }
  };
});

describe("Search Service", () => {
  const mockUserId = "user1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("keywordSearch", () => {
    it("should generate a regex query and return results", async () => {
      const mockDocs = [
        { _id: "doc1", title: "React context", description: "state mgmt" }
      ];
      vi.mocked(Resource.find).mockReturnValue({
        limit: vi.fn().mockResolvedValue(mockDocs)
      } as any);

      const results = await keywordSearch(mockUserId, "react state");
      
      expect(Resource.find).toHaveBeenCalled();
      const filterArg = (vi.mocked(Resource.find).mock.calls[0] as any)[0];
      expect(filterArg?.userId).toBe(mockUserId);
      expect(filterArg?.$or).toBeDefined();
      
      expect(results).toHaveLength(1);
      expect(results[0].matchType).toBe("keyword");
      expect(results[0].score).toBe(1.0);
      expect(results[0].resource).toEqual(mockDocs[0]);
    });
  });

  describe("semanticSearch", () => {
    it("should return empty array if embedding fails", async () => {
      vi.mocked(embeddingModule.generateEmbedding).mockResolvedValue(null);
      const results = await semanticSearch(mockUserId, "test");
      expect(results).toEqual([]);
    });

    it("should perform aggregate vector search", async () => {
      vi.mocked(embeddingModule.generateEmbedding).mockResolvedValue([0.1, 0.2]);
      
      // Mock aggregate result
      vi.mocked(Resource.aggregate).mockResolvedValue([
        { _id: "doc1", score: 0.95 }
      ]);

      // Mock hydrating find
      const mockDocs = [{ _id: { equals: (id: string) => id === "doc1" }, title: "doc1" }];
      vi.mocked(Resource.find).mockResolvedValue(mockDocs as any);

      const results = await semanticSearch(mockUserId, "test");
      
      expect(Resource.aggregate).toHaveBeenCalled();
      const aggPipeline = vi.mocked(Resource.aggregate).mock.calls[0][0] as any[];
      expect(aggPipeline[0].$vectorSearch).toBeDefined();

      expect(results).toHaveLength(1);
      expect(results[0].matchType).toBe("semantic");
      expect(results[0].score).toBe(0.95);
      expect(results[0].resource.title).toBe("doc1");
    });
  });

  describe("hybridSearch", () => {
    it("should combine and rank results with RRF", async () => {
      // Mock both semantic and keyword returns
      vi.mocked(embeddingModule.generateEmbedding).mockResolvedValue([0.1, 0.2]);
      
      vi.mocked(Resource.aggregate).mockResolvedValue([
        { _id: "doc1", score: 0.9 }
      ]);
      
      const doc1 = { _id: { toString: () => "doc1", equals: (id: string) => id === "doc1" }, title: "doc1" };
      const doc2 = { _id: { toString: () => "doc2", equals: (id: string) => id === "doc2" }, title: "doc2" };

      // We need to carefully mock Resource.find because it's used by both keywordSearch and semanticSearch
      vi.mocked(Resource.find).mockImplementation(((filter: any) => {
        if (filter._id && filter._id.$in) {
          // This is the hydrate query from semanticSearch
          return Promise.resolve([doc1]) as any;
        }
        // This is the keywordSearch query
        return { limit: vi.fn().mockResolvedValue([doc2, doc1]) } as any;
      }) as any);

      const results = await hybridSearch(mockUserId, "test query");

      expect(results).toHaveLength(2);
      
      expect(results[0].resource.title).toBe("doc1");
      expect(results[0].matchType).toBe("hybrid");
      expect(results[1].resource.title).toBe("doc2");
      expect(results[1].matchType).toBe("keyword");
    });
  });
});
