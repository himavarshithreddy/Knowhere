import { Resource, type ResourceDoc } from "../models/index.js";

export interface RediscoverySuggestion {
  resource: ResourceDoc;
  reason: string;
  score: number;
}

export const getTransmissions = async (userId: string): Promise<RediscoverySuggestion[]> => {
  // Get all resources that aren't locked, deleted, or archived
  const resources = await Resource.find({
    userId,
    locked: false,
    deletedAt: null,
    archived: false,
  }).lean() as ResourceDoc[];

  if (resources.length === 0) return [];

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Identify recent tags (last 14 days)
  const recentTags = new Set<string>();
  for (const r of resources) {
    const daysSinceCreated = (now - new Date(r.createdAt).getTime()) / dayMs;
    if (daysSinceCreated <= 14 && r.tags) {
      r.tags.forEach(t => recentTags.add(t));
    }
  }

  const suggestions: RediscoverySuggestion[] = [];

  for (const r of resources) {
    // Only suggest items saved > 14 days ago
    const daysSinceCreated = (now - new Date(r.createdAt).getTime()) / dayMs;
    if (daysSinceCreated < 14) continue;

    // Only suggest items not viewed in the last 30 days
    const daysSinceLastView = r.lastViewedAt
      ? (now - new Date(r.lastViewedAt).getTime()) / dayMs
      : daysSinceCreated;

    if (daysSinceLastView < 30) continue;

    // We don't want to suggest items that are completed or already active projects
    if (r.actionStatus === "completed" || r.actionStatus === "in_progress") continue;

    const neverViewed = r.viewCount === 0;
    
    let tagOverlap = 0;
    if (r.tags) {
      for (const t of r.tags) {
        if (recentTags.has(t)) tagOverlap++;
      }
    }

    const score = 
      (Math.min(daysSinceLastView, 365) * 0.4) + // Cap at 1 year for score
      (tagOverlap * 10) + // Give a good bump for contextual relevance
      (neverViewed ? 15 : 0) +
      (r.intentType === "mission" ? 10 : 0);

    let reason = "";
    if (tagOverlap > 0) {
      reason = `Matches your recent interest in ${r.tags?.[0] || "these topics"}`;
    } else if (neverViewed) {
      reason = "You saved this but never reviewed it";
    } else {
      const months = Math.floor(daysSinceLastView / 30);
      reason = `You haven't seen this in ${months} month${months > 1 ? "s" : ""}`;
    }

    suggestions.push({ resource: r, score, reason });
  }

  // Sort by score descending and take top 5
  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, 5);
};

export const getActiveMissions = async (userId: string) => {
  return await Resource.find({
    userId,
    actionStatus: "in_progress",
    deletedAt: null
  }).sort({ updatedAt: -1 }).lean();
};

export const getBrokenPromises = async (userId: string) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return await Resource.find({
    userId,
    intentType: "mission",
    actionStatus: "saved",
    createdAt: { $lt: thirtyDaysAgo },
    deletedAt: null,
    archived: false,
    locked: false
  }).sort({ createdAt: 1 }).limit(5).lean(); // Oldest first
};

export const getOpportunities = async (userId: string) => {
  return await Resource.find({
    userId,
    intentType: "idea",
    actionStatus: "saved",
    viewCount: 0,
    deletedAt: null,
    archived: false,
    locked: false
  }).sort({ createdAt: -1 }).limit(5).lean();
};

export const getWeeklyRecap = async (userId: string) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const resources = await Resource.find({
    userId,
    deletedAt: null
  }).lean() as ResourceDoc[];

  const newSavesThisWeek = resources.filter(r => new Date(r.createdAt) >= sevenDaysAgo).length;
  const reviewedThisWeek = resources.filter(r =>
    r.lastStatusChangeAt && new Date(r.lastStatusChangeAt) >= sevenDaysAgo &&
    (r.actionStatus === 'reviewed' || r.actionStatus === 'in_progress' || r.actionStatus === 'completed')
  ).length;
  const projectsStarted = resources.filter(r =>
    r.lastStatusChangeAt && new Date(r.lastStatusChangeAt) >= sevenDaysAgo &&
    r.actionStatus === 'in_progress'
  ).length;
  const projectsCompleted = resources.filter(r =>
    r.lastStatusChangeAt && new Date(r.lastStatusChangeAt) >= sevenDaysAgo &&
    r.actionStatus === 'completed'
  ).length;
  const itemsGoneDormant = resources.filter(r =>
    r.lastStatusChangeAt && new Date(r.lastStatusChangeAt) >= sevenDaysAgo &&
    r.actionStatus === 'dormant'
  ).length;

  // Collect tags from resources saved this week
  const recentTagCounts = new Map<string, number>();
  for (const r of resources) {
    if (new Date(r.createdAt) >= sevenDaysAgo && r.tags) {
      for (const tag of r.tags) {
        recentTagCounts.set(tag, (recentTagCounts.get(tag) ?? 0) + 1);
      }
    }
  }
  const topTagsThisWeek = Array.from(recentTagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  return { newSavesThisWeek, reviewedThisWeek, projectsStarted, projectsCompleted, itemsGoneDormant, topTagsThisWeek };
};
