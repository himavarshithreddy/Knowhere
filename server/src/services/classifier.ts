import { GoogleGenAI, Type } from "@google/genai";
import { config } from "../config.js";
import type { IntentType, ExtractedMetadata } from "@knowhere/shared";

// Create the Gemini client. We initialize it lazily if needed.
let ai: GoogleGenAI | null = null;
if (config.geminiApiKey) {
  ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
}

export interface ClassificationResult {
  intentType: IntentType;
  tags: string[];
  aiDescription?: string;
}

export const classifyResource = async (
  title: string,
  description: string,
  url?: string,
  metadata?: ExtractedMetadata
): Promise<ClassificationResult> => {
  const contentToAnalyze = [
    title,
    description,
    url,
    metadata?.title,
    metadata?.description,
    metadata?.siteName
  ].filter(Boolean).join("\n\n");

  // If Gemini is available, use it for intelligent classification
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Analyze the following saved web resource or note content and classify it.
        
Content:
"""
${contentToAnalyze}
"""

Task 1: Determine the user's intent for saving this resource.
- "mission": if it relates to building, creating, coding, launching something, learning, achieving, reading, or a personal challenge.
- "knowledge": if it's a tutorial, article, reference, guide, or tool that doesn't fit the above.
- "unclassified": if you cannot determine the intent.

Task 2: Extract 1-5 broad topic tags (e.g., "react", "marketing", "fitness", "android"). Tags MUST strictly be single words. Do not use multi-word phrases. Use lowercase alphanumeric characters and hyphens only.

Task 3: Generate a short, 1-2 sentence description summarizing what this resource is and why it might be useful. Do not use emojis.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intentType: {
                type: Type.STRING,
                enum: ["unclassified", "knowledge", "mission"],
              },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "1 to 5 strictly single-word lowercase tags",
              },
              aiDescription: {
                type: Type.STRING,
                description: "A short, 1-2 sentence description or summary of what this resource is and why it's useful. Do not use emojis.",
              }
            },
            required: ["intentType", "tags", "aiDescription"],
          },
          temperature: 0.1,
        },
      });

      if (response.text) {
        const result = JSON.parse(response.text);
        return {
          intentType: result.intentType as IntentType,
          tags: result.tags || [],
          aiDescription: result.aiDescription,
        };
      }
    } catch (err) {
      console.warn("Gemini classification failed, falling back to heuristics:", err);
    }
  }

  // Fallback to keyword heuristics if Gemini is unavailable or fails
  return fallbackClassification(contentToAnalyze, url);
};

const fallbackClassification = (content: string, url?: string): ClassificationResult => {
  const lowerContent = content.toLowerCase();
  
  let intentType: IntentType = "unclassified";
  
  const projectRegex = /\b(build|create|make|develop|launch|ship|deploy|saas|mvp|prototype)\b/i;
  const ideaRegex = /\b(startup idea|business idea|monetize|what if we|opportunity)\b/i;
  const goalRegex = /\b(learn|master|achieve|become|challenge|read 10|habit)\b/i;

  if (projectRegex.test(lowerContent) || ideaRegex.test(lowerContent) || goalRegex.test(lowerContent)) {
    intentType = "mission";
  }

  // Simple tag extraction based on a predefined list
  const possibleTags = [
    "react", "vue", "angular", "svelte", "javascript", "typescript", "node", "python", "go", "rust",
    "firebase", "mongodb", "postgres", "sql", "aws", "gcp", "azure", "docker", "kubernetes",
    "android", "ios", "react-native", "flutter", "swift", "kotlin",
    "css", "html", "tailwind", "ui", "ux", "design", "figma",
    "ai", "ml", "machine-learning", "llm", "data-science",
    "startup", "business", "marketing", "seo", "sales", "productivity", "fitness", "health"
  ];

  const tags = new Set<string>();
  
  // Check URL domain for hints (e.g. github -> development)
  if (url) {
    try {
      const hostname = new URL(url).hostname;
      if (hostname.includes("github") || hostname.includes("stackoverflow")) tags.add("development");
      if (hostname.includes("youtube")) tags.add("video");
      if (hostname.includes("medium") || hostname.includes("substack")) tags.add("article");
    } catch {
      // invalid URL, ignore
    }
  }

  // Check content against possible tags
  for (const tag of possibleTags) {
    if (new RegExp(`\\b${tag}\\b`, 'i').test(lowerContent)) {
      tags.add(tag);
      if (tags.size >= 5) break;
    }
  }

  return {
    intentType,
    tags: Array.from(tags)
  };
};
