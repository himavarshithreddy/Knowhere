import { Resource, InteractionEvent, type ResourceDoc } from "../models/index.js";
import { GoogleGenAI, Type } from "@google/genai";
import { config } from "../config.js";

let ai: GoogleGenAI | null = null;
if (config.geminiApiKey) {
  ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
}

export const getAdvancedAnalytics = async (userId: string) => {
  const resources = await Resource.find({ userId, deletedAt: null }).lean();
  const interactions = await InteractionEvent.find({ userId }).lean();
  
  const now = Date.now();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  const oldResources = resources.filter(r => (now - new Date(r.createdAt).getTime()) > ninetyDaysMs);

  // MEMORY ANALYTICS
  const savedCount = resources.length;
  const rediscoverClicks = interactions.filter(i => i.type === "rediscover_click").length;
  
  let forgottenCount = 0;
  for (const r of oldResources) {
    const hasOpen = interactions.some(i => String(i.resourceId) === String(r._id) && i.type === "open");
    if (!hasOpen) forgottenCount++;
  }
  
  // INTENT ANALYTICS
  const projects = resources.filter(r => r.intentType === "mission" || (r.intentType as any) === "project");
  const projectsStarted = projects.filter(r => r.actionStatus === "in_progress" || r.actionStatus === "completed").length;
  const projectsCompleted = projects.filter(r => r.actionStatus === "completed").length;
  const dormantIdeas = resources.filter(r => (r.intentType as any) === "idea" && (now - new Date(r.createdAt).getTime()) > ninetyDaysMs).length;
  
  // KNOWLEDGE ACTIVATION RATE
  let activatedCount = 0;
  for (const r of resources) {
    if (r.actionStatus === "completed" || r.actionStatus === "applied") {
      activatedCount++;
    } else {
      const resourceInteractions = interactions.filter(i => String(i.resourceId) === String(r._id));
      if (resourceInteractions.some(i => i.type === "use" || i.type === "build")) {
        activatedCount++;
      }
    }
  }
  
  const activationRate = savedCount > 0 ? (activatedCount / savedCount) * 100 : 0;
  
  // TOP INTERESTS
  const tagCounts: Record<string, number> = {};
  resources.forEach(r => {
    if (r.tags) r.tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  });
  const topInterests = Object.entries(tagCounts).sort((a,b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);

  return {
    savedCount,
    rediscoverClicks,
    projectsStarted,
    projectsCompleted,
    forgottenCount,
    dormantIdeas,
    activationRate: Math.round(activationRate),
    topInterests
  };
};

export const generateDashboardIntelligence = async (userId: string): Promise<any> => {
  const stats = await getAdvancedAnalytics(userId);
  
  if (stats.savedCount < 3) return null;
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are Knowhere's elite Intelligence Engine.
Analyze these V4 Memory, Intent, and Action analytics to generate a structured insights report.

Raw Stats:
${JSON.stringify(stats, null, 2)}

Definitions:
- Knowledge Activation Rate: % of saved items that were later used or completed. High is amazing.
- Forgotten Count: Items saved >90 days ago never opened.
- Dormant Ideas: Ideas untouched for 90 days.

Instructions:
1. "summary": A 1-sentence powerful statement about their knowledge activation and intent.
2. "keyMetrics": Exactly 4 crucial metrics (e.g., Activation Rate, Projects Completed, Forgotten Items).
3. "trends": 1-2 patterns (e.g. "High hoarding, low activation"). Give an iconName (Activity, TrendingUp, Target, Brain, Sparkles, AlertCircle).
4. "anomalies": 0-2 anomalies (e.g., hoarding without reviewing).
5. "forecasts": 1 prediction based on intent/action momentum.
6. "actionableAdvice": 1-2 specific actions to improve their knowledge system today.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             summary: { type: Type.STRING },
             keyMetrics: {
               type: Type.ARRAY,
               items: {
                 type: Type.OBJECT,
                 properties: {
                   label: { type: Type.STRING },
                   value: { type: Type.STRING },
                   trend: { type: Type.STRING },
                   trendDirection: { type: Type.STRING, enum: ["up", "down", "flat"] },
                   color: { type: Type.STRING, enum: ["green", "red", "yellow", "blue"] }
                 },
                 required: ["label", "value", "trend", "trendDirection", "color"]
               }
             },
             trends: {
               type: Type.ARRAY,
               items: {
                 type: Type.OBJECT,
                 properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, iconName: { type: Type.STRING } },
                 required: ["title", "description", "iconName"]
               }
             },
             anomalies: {
               type: Type.ARRAY,
               items: {
                 type: Type.OBJECT,
                 properties: { description: { type: Type.STRING }, severity: { type: Type.STRING, enum: ["low", "medium", "high"] } },
                 required: ["description", "severity"]
               }
             },
             forecasts: {
               type: Type.ARRAY,
               items: {
                 type: Type.OBJECT,
                 properties: { prediction: { type: Type.STRING }, timeframe: { type: Type.STRING } },
                 required: ["prediction", "timeframe"]
               }
             },
             actionableAdvice: {
               type: Type.ARRAY,
               items: {
                 type: Type.OBJECT,
                 properties: { action: { type: Type.STRING }, reason: { type: Type.STRING } },
                 required: ["action", "reason"]
               }
             }
          },
          required: ["summary", "keyMetrics", "trends", "anomalies", "forecasts", "actionableAdvice"]
        },
        temperature: 0.1
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
  } catch (err) {
    console.error("Failed to generate intelligence:", err);
    return null;
  }
};
