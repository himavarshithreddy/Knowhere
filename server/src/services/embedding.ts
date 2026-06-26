import OpenAI from "openai";
import PQueue from "p-queue";
import { config } from "../config.js";
import type { ResourceDoc } from "../models/index.js";

// Initialize OpenAI client for OpenRouter
let ai: OpenAI | null = null;
if (config.openRouterKey) {
  ai = new OpenAI({ 
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: config.openRouterKey 
  });
}

// Queue to handle rate limits gracefully
const queue = new PQueue({ concurrency: 5 });

export const generateEmbedding = async (text: string): Promise<number[] | null> => {
  if (!ai || !text.trim()) return null;
  
  return queue.add(async () => {
    try {
      const response = await ai.embeddings.create({
        model: config.embeddingModel,
        input: text,
      });
      return response.data[0]?.embedding || null;
    } catch (err) {
      console.warn("Failed to generate embedding:", err);
      return null;
    }
  }) as Promise<number[] | null>;
};

export const generateResourceEmbedding = async (resource: ResourceDoc): Promise<number[] | null> => {
  const contentToAnalyze = [
    resource.title,
    resource.description,
    resource.aiDescription,
    resource.tags?.join(", "),
    resource.metadata?.siteName,
    resource.url
  ].filter(Boolean).join("\n\n");
  
  // Truncate to ~8000 characters to prevent hitting typical embedding token limits
  const truncatedContent = contentToAnalyze.slice(0, 8000);
  
  return generateEmbedding(truncatedContent);
};
