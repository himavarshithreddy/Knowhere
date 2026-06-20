import { Resource, InteractionEvent, SearchEvent, type ResourceDoc } from "../models/index.js";

export interface RediscoverySuggestion {
  resource: ResourceDoc;
  reason: string;
  tier: 1 | 2 | 3;
}

export const getTieredRecommendations = async (userId: string): Promise<RediscoverySuggestion[]> => {
  const resources = await Resource.find({ userId, deletedAt: null, archived: false }).lean() as ResourceDoc[];
  const interactions = await InteractionEvent.find({ userId }).lean();
  const searches = await SearchEvent.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const ninetyDaysMs = 90 * dayMs;
  const elevenMonthsMs = 11 * 30 * dayMs;

  const suggestions: RediscoverySuggestion[] = [];

  // Identify recent activity tags (last 14 days)
  const recentTags = new Set<string>();
  const recentSaves = resources.filter(r => (now - new Date(r.createdAt).getTime()) <= 14 * dayMs);
  recentSaves.forEach(r => r.tags?.forEach(t => recentTags.add(t)));

  // TIER 1: Current Activity Matching & Repeated Search Detection
  const recentSearches = searches.filter(s => (now - new Date(s.createdAt).getTime()) <= 3 * dayMs);
  
  for (const s of recentSearches) {
    // Check if they searched this multiple times
    const timesSearched = searches.filter(x => x.query.toLowerCase() === s.query.toLowerCase()).length;
    if (timesSearched >= 3) {
      // Find a matching resource
      const matching = resources.find(r => r.title.toLowerCase().includes(s.query.toLowerCase()) || r.tags?.includes(s.query.toLowerCase()));
      if (matching && !suggestions.some(x => String(x.resource._id) === String(matching._id))) {
        suggestions.push({
          resource: matching,
          reason: `You've searched for "${s.query}" ${timesSearched} times. Pin this permanently?`,
          tier: 1
        });
      }
    }
  }

  // TIER 2: Inactivity Recovery & Opportunity Resurrection
  for (const r of resources) {
    if (suggestions.some(x => String(x.resource._id) === String(r._id))) continue;
    
    const ageMs = now - new Date(r.createdAt).getTime();
    
    // Opportunity Resurrection: Idea > 11 months, overlaps with recent tags
    if (r.intentType === ("idea" as any) && ageMs > elevenMonthsMs) {
      const overlap = r.tags?.some(t => recentTags.has(t));
      if (overlap) {
        suggestions.push({
          resource: r,
          reason: "This old idea overlaps with your current interests. Time to resurrect it?",
          tier: 2
        });
        continue;
      }
    }

    // Inactivity Recovery: > 90 days, 0 views
    const hasOpen = interactions.some(i => String(i.resourceId) === String(r._id) && i.type === "open");
    if (ageMs > ninetyDaysMs && !hasOpen) {
      suggestions.push({
        resource: r,
        reason: "You planned to review this 3 months ago. Still interested?",
        tier: 2
      });
      continue;
    }
  }

  // TIER 3: Knowledge Decay
  for (const r of resources) {
    if (suggestions.some(x => String(x.resource._id) === String(r._id))) continue;
    
    const ageMs = now - new Date(r.createdAt).getTime();
    // > 180 days, opened once but never "used" or "completed"
    if (ageMs > 180 * dayMs) {
      const resourceInteractions = interactions.filter(i => String(i.resourceId) === String(r._id));
      const hasUsed = resourceInteractions.some(i => i.type === "use" || i.type === "build" || i.type === "complete");
      if (!hasUsed && resourceInteractions.length > 0) {
        suggestions.push({
          resource: r,
          reason: "You saved and viewed this, but never used it. Knowledge is decaying.",
          tier: 3
        });
      }
    }
  }

  return suggestions;
};

export const getDailyFallbackNotification = async (userId: string): Promise<RediscoverySuggestion | null> => {
  const recs = await getTieredRecommendations(userId);
  if (recs.length > 0) {
    // Return the highest priority (Tier 1 > Tier 2 > Tier 3)
    recs.sort((a, b) => a.tier - b.tier);
    return recs[0];
  }
  
  // Ultimate Fallback: Just return a random unread resource
  const resources = await Resource.find({ userId, deletedAt: null, archived: false }).lean() as ResourceDoc[];
  const interactions = await InteractionEvent.find({ userId, type: "open" }).lean();
  const unread = resources.filter(r => !interactions.some(i => String(i.resourceId) === String(r._id)));
  if (unread.length > 0) {
    const random = unread[Math.floor(Math.random() * unread.length)];
    return {
      resource: random,
      reason: "A random discovery from your unread vault.",
      tier: 3
    };
  }

  return null;
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
  }).sort({ createdAt: 1 }).limit(5).lean();
};

export const getOpportunities = async (userId: string) => {
  return await Resource.find({
    userId,
    intentType: ("idea" as any),
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
