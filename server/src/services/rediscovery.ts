import { Resource, InteractionEvent, SearchEvent, type ResourceDoc } from "../models/index.js";

export interface RediscoverySuggestion {
  resource: ResourceDoc;
  reason: string;
  tier: 1 | 2 | 3 | 4;
}

const getResourceContext = (r: ResourceDoc) => {
  const now = Date.now();
  const ageMs = now - new Date(r.createdAt).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const ageDays = Math.floor(ageMs / dayMs);
  
  const typeText = r.type === "link" ? "link" 
                 : r.type === "pdf" ? "document"
                 : r.type === "image" ? "image" 
                 : "note";
    
  let ageDescription = "recently";
  if (ageDays > 0) {
    if (ageDays === 1) ageDescription = "yesterday";
    else if (ageDays < 7) ageDescription = `${ageDays} days ago`;
    else if (ageDays < 30) ageDescription = `${Math.floor(ageDays / 7)} weeks ago`;
    else ageDescription = `${Math.floor(ageDays / 30)} months ago`;
  }
  
  return { typeText, ageDescription };
};

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
          reason: `You've searched for "${s.query}" ${timesSearched} times recently. Pin this permanently?`,
          tier: 1
        });
      }
    }
  }

  // TIER 2: Inactivity Recovery & Opportunity Resurrection
  for (const r of resources) {
    if (suggestions.some(x => String(x.resource._id) === String(r._id))) continue;
    
    const ageMs = now - new Date(r.createdAt).getTime();
    const title = r.title || r.metadata?.title || getResourceContext(r).typeText;
    const truncatedTitle = title.length > 50 ? title.substring(0, 47) + "..." : title;
    
    // Opportunity Resurrection: Idea > 11 months, overlaps with recent tags
    if (r.intentType === ("idea" as any) && ageMs > elevenMonthsMs) {
      const overlap = r.tags?.some(t => recentTags.has(t));
      if (overlap) {
        const { ageDescription } = getResourceContext(r);
        suggestions.push({
          resource: r,
          reason: `Your old idea "${truncatedTitle}" from ${ageDescription} matches your recent interests. Resurrect it?`,
          tier: 2
        });
        continue;
      }
    }

    // Inactivity Recovery: > 90 days, 0 views
    const hasOpen = interactions.some(i => String(i.resourceId) === String(r._id) && i.type === "open");
    if (ageMs > ninetyDaysMs && !hasOpen) {
      const { ageDescription } = getResourceContext(r);
      suggestions.push({
        resource: r,
        reason: `You saved "${truncatedTitle}" ${ageDescription} but never opened or reviewed it.`,
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
        const { ageDescription } = getResourceContext(r);
        const title = r.title || r.metadata?.title || "this resource";
        const truncatedTitle = title.length > 50 ? title.substring(0, 47) + "..." : title;
        suggestions.push({
          resource: r,
          reason: `You viewed "${truncatedTitle}" ${ageDescription}, but never applied it. Knowledge is decaying.`,
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
    // Sort by tier to find the highest priority (lowest tier number)
    recs.sort((a, b) => a.tier - b.tier);
    const highestPriorityTier = recs[0].tier;
    
    // Gather all recommendations in this top tier
    const topTierRecs = recs.filter(r => r.tier === highestPriorityTier);
    
    // Pick a random one from the top tier
    return topTierRecs[Math.floor(Math.random() * topTierRecs.length)];
  }
  
  // Ultimate Fallback: Just return a random unread resource
  const resources = await Resource.find({ userId, deletedAt: null, archived: false }).lean() as ResourceDoc[];
  const interactions = await InteractionEvent.find({ userId, type: "open" }).lean();
  const unread = resources.filter(r => !interactions.some(i => String(i.resourceId) === String(r._id)));
  if (unread.length > 0) {
    const random = unread[Math.floor(Math.random() * unread.length)];
    const { typeText, ageDescription } = getResourceContext(random);
    
    const templates = [
      `A forgotten ${typeText} you saved ${ageDescription}. Time to review?`,
      `This unread ${typeText} was captured ${ageDescription}. Don't let it drift away.`,
      `You hoarded this ${typeText} ${ageDescription}. Let's turn it into active knowledge.`,
      `A random discovery from your vault saved ${ageDescription} with 0 opens.`
    ];
    const reason = templates[Math.floor(Math.random() * templates.length)];
    
    return {
      resource: random,
      reason,
      tier: 3
    };
  }

  // Absolute Final Fallback: Score resources based on analytics and pick the best one
  if (resources.length > 0) {
    const scoredResources = resources.map(r => {
      let score = 0;
      
      // Insight 1: User explicitly marked as valuable
      if (r.favorite) score += 50;
      
      // Insight 2: High interaction frequency
      score += Math.min((r.viewCount || 0) * 10, 50);
      
      // Insight 3: Active but not completed
      if (r.actionStatus === "in_progress") score += 30;
      if (r.intentType === "mission") score += 20;
      
      // Insight 4: Milestone progress
      if (r.milestones && r.milestones.length > 0) {
        const completedCount = r.milestones.filter(m => m.completed).length;
        if (completedCount < r.milestones.length) score += 20; // Has pending work
        if (completedCount > 0) score += 10; // Has some momentum
      }
      
      // Insight 5: Don't recommend if they literally just viewed it today
      if (r.lastViewedAt) {
        const daysSinceView = (Date.now() - new Date(r.lastViewedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceView < 1) score -= 40;
      }
      
      // Add a tiny bit of entropy to break ties and prevent repetitive recommendations
      score += Math.random() * 5;
      
      return { resource: r, score };
    });

    scoredResources.sort((a, b) => b.score - a.score);
    const bestResource = scoredResources[0].resource;
    
    const { ageDescription } = getResourceContext(bestResource);
    const title = bestResource.title || bestResource.metadata?.title || "this resource";
    const truncatedTitle = title.length > 50 ? title.substring(0, 47) + "..." : title;
    
    const templates = [
      `Your highly-ranked save "${truncatedTitle}" from ${ageDescription} is waiting. Let's keep the momentum going.`,
      `Based on your activity, "${truncatedTitle}" is a top priority today.`,
      `You've shown high interest in "${truncatedTitle}". Dive back in?`
    ];
    const reason = templates[Math.floor(Math.random() * templates.length)];
    
    return {
      resource: bestResource,
      reason,
      tier: 4
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
