import { Resource, type ResourceDoc } from "../models/index.js";
import { generateEmbedding } from "./embedding.js";

export interface SearchResult {
  resource: ResourceDoc;
  score: number;
  matchType: "semantic" | "keyword" | "hybrid";
}

export interface SearchOptions {
  type?: "link" | "note" | "image" | "pdf";
  limit?: number;
  excludeTrashed?: boolean;
  excludeArchived?: boolean;
}

export const semanticSearch = async (userId: string, query: string, options: SearchOptions = {}): Promise<SearchResult[]> => {
  const queryVector = await generateEmbedding(query);
  if (!queryVector) return [];

  const filter: any = { userId };
  if (options.excludeTrashed !== false) filter.deletedAt = null;
  if (options.excludeArchived !== false) filter.archived = false;
  if (options.type) filter.type = options.type;

  try {
    const results = await Resource.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector,
          numCandidates: 100,
          limit: options.limit || 20,
          filter,
        }
      },
      {
        $project: {
          _id: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ]);
    
    // Hydrate to full ResourceDoc
    const docs = await Resource.find({ _id: { $in: results.map(r => r._id) } });
    
    const filtered = results.map(r => {
      const doc = docs.find(d => d._id.equals(r._id));
      if (!doc) return null;
      return {
        resource: doc as any,
        score: r.score as number,
        matchType: "semantic" as const
      };
    }).filter(r => r !== null);
    
    return filtered as any as SearchResult[];
  } catch (error) {
    console.warn("Atlas Vector Search failed (perhaps index not created?), falling back to empty semantic results.", error);
    return [];
  }
};

export const keywordSearch = async (userId: string, query: string, options: SearchOptions = {}): Promise<SearchResult[]> => {
  const filter: any = { userId };
  if (options.excludeTrashed !== false) filter.deletedAt = null;
  if (options.excludeArchived !== false) filter.archived = false;
  if (options.type) filter.type = options.type;

  const terms = query.split(/\s+/).filter(Boolean);
  if (terms.length > 0) {
    const regex = new RegExp(terms.join("|"), "i");
    filter.$or = [
      { title: regex },
      { description: regex },
      { aiDescription: regex },
      { tags: { $in: [regex] } },
      { url: regex }
    ];
  }

  const docs = await Resource.find(filter).limit(options.limit || 20);
  
  return docs.map(doc => ({
    resource: doc as any,
    score: 1.0,
    matchType: "keyword" as const
  }));
};

export const hybridSearch = async (userId: string, query: string, options: SearchOptions = {}): Promise<SearchResult[]> => {
  const limit = options.limit || 10;
  
  const [semanticResults, keywordResults] = await Promise.all([
    semanticSearch(userId, query, { ...options, limit: limit * 2 }),
    keywordSearch(userId, query, { ...options, limit: limit * 2 })
  ]);
  
  // Reciprocal Rank Fusion (RRF)
  const K = 60;
  const scores = new Map<string, SearchResult>();
  
  semanticResults.forEach((r, rank) => {
    const id = r.resource._id.toString();
    scores.set(id, {
      resource: r.resource,
      score: 1 / (K + rank + 1),
      matchType: "semantic"
    });
  });
  
  keywordResults.forEach((r, rank) => {
    const id = r.resource._id.toString();
    const existing = scores.get(id);
    if (existing) {
      existing.score += 1 / (K + rank + 1);
      existing.matchType = "hybrid";
    } else {
      scores.set(id, {
        resource: r.resource,
        score: 1 / (K + rank + 1),
        matchType: "keyword"
      });
    }
  });
  
  const merged = Array.from(scores.values()).sort((a, b) => b.score - a.score);
  return merged.slice(0, limit);
};
