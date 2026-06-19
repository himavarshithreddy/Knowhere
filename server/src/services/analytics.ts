import { Resource } from "../models/index.js";
import { GoogleGenAI, Type } from "@google/genai";
import { config } from "../config.js";

let ai: GoogleGenAI | null = null;
if (config.geminiApiKey) {
  ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
}

export const generateDashboardIntelligence = async (userId: string): Promise<any> => {
  const resources = await Resource.find({ userId, deletedAt: null, archived: false }).lean();
  
  if (resources.length < 3) return null; // Not enough data

  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  
  // 1. Velocity (Saves past 7 days vs previous 7 days)
  const savesThisWeek = resources.filter(r => (now - new Date(r.createdAt).getTime()) < weekMs).length;
  const savesLastWeek = resources.filter(r => {
     const t = now - new Date(r.createdAt).getTime();
     return t >= weekMs && t < weekMs * 2;
  }).length;

  // 2. Entropy (Focus Score)
  const tagCounts: Record<string, number> = {};
  let totalTags = 0;
  resources.forEach(r => {
    if (r.tags) {
      r.tags.forEach(t => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
        totalTags++;
      });
    }
  });
  
  let entropy = 0;
  if (totalTags > 0) {
    for (const count of Object.values(tagCounts)) {
      const p = count / totalTags;
      entropy -= p * Math.log2(p);
    }
  }
  // Max entropy for N tags is log2(N). We normalize focus score from 0 to 100.
  // Lower entropy = higher focus.
  const uniqueTags = Object.keys(tagCounts).length;
  const maxEntropy = uniqueTags > 1 ? Math.log2(uniqueTags) : 1;
  const focusScore = uniqueTags > 0 ? Math.max(0, 100 - ((entropy / maxEntropy) * 100)) : 100;

  // 3. Dormancy Ratio
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const oldResources = resources.filter(r => (now - new Date(r.createdAt).getTime()) > thirtyDaysMs);
  const dormantCount = oldResources.filter(r => r.viewCount === 0).length;
  const dormancyRate = oldResources.length ? (dormantCount / oldResources.length) * 100 : 0;

  // 4. Intent Distribution
  const intents: Record<string, number> = { knowledge: 0, project: 0, idea: 0, goal: 0, unclassified: 0 };
  resources.forEach(r => {
    if (r.intentType) intents[r.intentType] = (intents[r.intentType] || 0) + 1;
  });

  // 5. Action Velocity
  const completedThisWeek = resources.filter(r => 
    r.actionStatus === "completed" && 
    r.lastStatusChangeAt && 
    (now - new Date(r.lastStatusChangeAt).getTime()) < weekMs
  ).length;

  const rawStats = {
    totalItems: resources.length,
    savesThisWeek,
    savesLastWeek,
    saveVelocityChangePercent: savesLastWeek ? Math.round(((savesThisWeek - savesLastWeek) / savesLastWeek) * 100) : 0,
    focusScore: Math.round(focusScore),
    dormancyRatePercent: Math.round(dormancyRate),
    intentDistribution: intents,
    topTags: Object.entries(tagCounts).sort((a,b) => b[1] - a[1]).slice(0, 10).map(e => e[0]),
    projectsCompletedThisWeek: completedThisWeek
  };

  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an elite productivity and knowledge management analyst.
Analyze the user's personal knowledge system statistics and generate a structured dashboard intelligence report.

Raw Stats:
${JSON.stringify(rawStats, null, 2)}

Definitions:
- Focus Score (0-100): Higher means they are focused on a few core topics. Lower means their interests are scattered (high entropy).
- Dormancy Rate: Percentage of items older than 30 days they have NEVER opened. High dormancy means they are hoarding, not learning.

Instructions:
1. "summary": A 1-sentence high-level overview of their system's health.
2. "keyMetrics": Exactly 4 metrics highlighting the most important numbers. Provide a label, a value (e.g. "45%", "12"), a trend string (e.g. "+5%"), trendDirection (up, down, flat), and a color (green for good, red for bad, yellow for warning, blue for neutral).
3. "trends": 1 to 2 visual trends explaining patterns in their behavior (e.g., heavily focused on React). Give an iconName (one of: Activity, TrendingUp, Target, Brain, Sparkles, AlertCircle).
4. "anomalies": 0 to 2 anomalies or bottlenecks (e.g. hoarding without reviewing, sudden drop in velocity).
5. "forecasts": 1 prediction of what will happen if current trends continue (e.g., "At this rate, you'll accumulate 50 unreviewed items by month-end").
6. "actionableAdvice": 1 to 2 very specific actions they should take today to improve their knowledge system.`,
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
    console.error("Failed to generate dashboard intelligence:", err);
    return null;
  }
};
