import { Resource, InteractionEvent, type ResourceDoc } from "../models/index.js";
import OpenAI from "openai";
import { config } from "../config.js";

let ai: OpenAI | null = null;
if (config.openRouterKey) {
  ai = new OpenAI({ 
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: config.openRouterKey 
  });
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
    const prompt = `You are Nebula, Knowhere's elite intelligence layer.
Analyze these Memory, Intent, and Action analytics to generate a structured insights report.

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
6. "actionableAdvice": 1-2 specific actions to improve their knowledge system today.`;

    const response = await ai.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "dashboard_intelligence",
          strict: true,
          schema: {
            type: "object",
            properties: {
             summary: { type: "string" },
             keyMetrics: {
               type: "array",
               items: {
                 type: "object",
                 properties: {
                   label: { type: "string" },
                   value: { type: "string" },
                   trend: { type: "string" },
                   trendDirection: { type: "string", enum: ["up", "down", "flat"] },
                   color: { type: "string", enum: ["green", "red", "yellow", "blue"] }
                 },
                 required: ["label", "value", "trend", "trendDirection", "color"],
                 additionalProperties: false
               }
             },
             trends: {
               type: "array",
               items: {
                 type: "object",
                 properties: { title: { type: "string" }, description: { type: "string" }, iconName: { type: "string" } },
                 required: ["title", "description", "iconName"],
                 additionalProperties: false
               }
             },
             anomalies: {
               type: "array",
               items: {
                 type: "object",
                 properties: { description: { type: "string" }, severity: { type: "string", enum: ["low", "medium", "high"] } },
                 required: ["description", "severity"],
                 additionalProperties: false
               }
             },
             forecasts: {
               type: "array",
               items: {
                 type: "object",
                 properties: { prediction: { type: "string" }, timeframe: { type: "string" } },
                 required: ["prediction", "timeframe"],
                 additionalProperties: false
               }
             },
             actionableAdvice: {
               type: "array",
               items: {
                 type: "object",
                 properties: { action: { type: "string" }, reason: { type: "string" } },
                 required: ["action", "reason"],
                 additionalProperties: false
               }
             }
            },
            required: ["summary", "keyMetrics", "trends", "anomalies", "forecasts", "actionableAdvice"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Failed to generate intelligence:", err);
    return null;
  }
};
