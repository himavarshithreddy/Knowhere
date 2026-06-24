import { Resource, InteractionEvent, SearchEvent, type ResourceDoc } from "../models/index.js";
import { NotificationLedger } from "../models/EventLog.js";
import { config } from "../config.js";

export interface RediscoverySuggestion {
  resource: ResourceDoc;
  reason: string;
  tier: 1 | 2 | 3 | 4;
  selectionReason?: string;
  wasEscapeHatch?: boolean;
}

interface ResourceNotifState {
  impressions: number;
  clicks: number;
  unclickedImpressions: number;
  lastShownAt: number;
  lastClickedAt: number | null;
  onNormalCooldown: boolean;
  onCriticalCooldown: boolean;
  hibernatedUntil: number | null;
}

interface UserNotifState {
  totalSent14d: number;
  totalClicked14d: number;
  ctr14d: number;
  engagementLevel: "engaged" | "passive" | "fatigued";
  recentTags: Map<string, number>;
  recentTypes: Map<string, number>;
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

const DAY_MS = 86_400_000;

function buildNotifState(
  ledger: any[],
  resources: ResourceDoc[]
): { byResource: Map<string, ResourceNotifState>; user: UserNotifState } {
  const now = Date.now();
  const byResource = new Map<string, ResourceNotifState>();
  const resourceLookup = new Map(resources.map(r => [String(r._id), r]));

  let totalSent14d = 0;
  let totalClicked14d = 0;
  const recentTags = new Map<string, number>();
  const recentTypes = new Map<string, number>();

  for (const entry of ledger) {
    const rid = String(entry.resourceId);
    const age = now - new Date(entry.createdAt).getTime();

    let state = byResource.get(rid);
    if (!state) {
      state = {
        impressions: 0, clicks: 0, unclickedImpressions: 0,
        lastShownAt: 0, lastClickedAt: null,
        onNormalCooldown: false, onCriticalCooldown: false, hibernatedUntil: null,
      };
      byResource.set(rid, state);
    }

    state.impressions++;
    if (entry.clicked) {
      state.clicks++;
      const clickTime = entry.clickedAt ? new Date(entry.clickedAt).getTime() : new Date(entry.createdAt).getTime();
      if (!state.lastClickedAt || clickTime > state.lastClickedAt) state.lastClickedAt = clickTime;
    } else {
      state.unclickedImpressions++;
    }

    const shownTime = new Date(entry.createdAt).getTime();
    if (shownTime > state.lastShownAt) state.lastShownAt = shownTime;

    if (age < config.notifCooldownDays * DAY_MS) state.onNormalCooldown = true;
    if (age < config.notifCriticalCooldownDays * DAY_MS) state.onCriticalCooldown = true;

    if (age < 14 * DAY_MS) {
      totalSent14d++;
      if (entry.clicked) totalClicked14d++;
    }

    if (age < 7 * DAY_MS) {
      const res = resourceLookup.get(rid);
      if (res) {
        if (res.type) recentTypes.set(res.type, (recentTypes.get(res.type) ?? 0) + 1);
        res.tags?.forEach(t => recentTags.set(t, (recentTags.get(t) ?? 0) + 1));
      }
    }
  }

  for (const state of byResource.values()) {
    if (state.unclickedImpressions >= config.notifMaxImpressions) {
      state.hibernatedUntil = state.lastShownAt + (config.notifHibernationDays * DAY_MS);
    }
  }

  const ctr14d = totalSent14d > 0 ? totalClicked14d / totalSent14d : -1;
  let engagementLevel: "engaged" | "passive" | "fatigued" = "engaged";
  if (totalSent14d >= 4) {
    if (ctr14d <= 0.10) engagementLevel = "fatigued";
    else if (ctr14d <= 0.30) engagementLevel = "passive";
  }

  return {
    byResource,
    user: { totalSent14d, totalClicked14d, ctr14d, engagementLevel, recentTags, recentTypes },
  };
}

const SR_INTERVALS = [1, 3, 7, 14, 30, 60, 90];
const SR_MAX_ACTIVE_SLOTS = 10;

async function computeSpacedSchedule(
  byResource: Map<string, ResourceNotifState>,
  userId: string
): Promise<Map<string, Date>> {
  const schedule = new Map<string, Date>();
  const clickedResources: { resourceId: string; clickCount: number; lastClickedAt: number }[] = [];
  
  for (const [rid, state] of byResource) {
    if (state.clicks > 0 && state.lastClickedAt) {
      clickedResources.push({
        resourceId: rid,
        clickCount: state.clicks,
        lastClickedAt: state.lastClickedAt,
      });
    }
  }

  if (clickedResources.length === 0) return schedule;

  const clickedRids = clickedResources.map(c => c.resourceId);
  const followUpInteractions = await InteractionEvent.find({
    userId,
    resourceId: { $in: clickedRids },
    type: { $in: ["open", "use", "build", "complete"] },
  }).lean();

  const confirmedSet = new Set<string>();
  for (const cr of clickedResources) {
    const hasFollowUp = followUpInteractions.some(i => {
      if (String(i.resourceId) !== cr.resourceId) return false;
      const interactionTime = new Date(i.createdAt).getTime();
      return interactionTime >= cr.lastClickedAt && interactionTime <= cr.lastClickedAt + DAY_MS;
    });
    if (hasFollowUp) confirmedSet.add(cr.resourceId);
  }

  const eligible = clickedResources
    .filter(c => confirmedSet.has(c.resourceId))
    .sort((a, b) => b.lastClickedAt - a.lastClickedAt)
    .slice(0, SR_MAX_ACTIVE_SLOTS);

  for (const { resourceId, clickCount, lastClickedAt } of eligible) {
    if (clickCount > SR_INTERVALS.length) continue;
    const intervalIndex = Math.min(clickCount - 1, SR_INTERVALS.length - 1);
    const nextInterval = SR_INTERVALS[intervalIndex];
    const nextReviewDate = new Date(lastClickedAt + nextInterval * DAY_MS);
    schedule.set(resourceId, nextReviewDate);
  }

  return schedule;
}

const TIER_WEIGHTS: Record<number, number> = { 1: 60, 2: 25, 3: 12, 4: 3 };

function pickFromWeightedTiers(
  tierMap: Map<number, RediscoverySuggestion[]>,
  byResource: Map<string, ResourceNotifState>
): RediscoverySuggestion | null {
  const available = Object.entries(TIER_WEIGHTS)
    .map(([tier, weight]) => ({ tier: Number(tier), weight }))
    .filter(({ tier }) => (tierMap.get(tier)?.length ?? 0) > 0);

  if (available.length === 0) return null;

  const totalTierWeight = available.reduce((sum, { weight }) => sum + weight, 0);
  let tierRoll = Math.random() * totalTierWeight;
  let selectedTier = available[available.length - 1].tier;

  for (const { tier, weight } of available) {
    tierRoll -= weight;
    if (tierRoll <= 0) { selectedTier = tier; break; }
  }

  const candidates = tierMap.get(selectedTier)!;
  const decayFactor = config.notifImpressionDecay;

  const weights = candidates.map(c => {
    const unclicked = byResource.get(String(c.resource._id))?.unclickedImpressions ?? 0;
    return Math.pow(decayFactor, unclicked);
  });

  const totalCandidateWeight = weights.reduce((a, b) => a + b, 0);
  if (totalCandidateWeight <= 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  let candidateRoll = Math.random() * totalCandidateWeight;
  for (let i = 0; i < candidates.length; i++) {
    candidateRoll -= weights[i];
    if (candidateRoll <= 0) return candidates[i];
  }

  return candidates[candidates.length - 1];
}

function scoredFallbackPick(
  resources: ResourceDoc[],
  byResource: Map<string, ResourceNotifState>,
  getResourceContext: (r: ResourceDoc) => { typeText: string, ageDescription: string }
): RediscoverySuggestion | null {
  const decayFactor = config.notifImpressionDecay;

  const scored = resources.map(r => {
    let score = 100;
    if (r.favorite) score += 30;
    score += Math.min((r.viewCount || 0) * 10, 30);
    if (r.actionStatus === "in_progress") score += 30;
    if (r.intentType === "mission") score += 20;
    if (r.milestones?.length) {
      const done = r.milestones.filter(m => m.completed).length;
      if (done < r.milestones.length) score += 20;
      if (done > 0) score += 10;
    }
    if (r.lastViewedAt) {
      const daysSince = (Date.now() - new Date(r.lastViewedAt).getTime()) / DAY_MS;
      if (daysSince < 1) score -= 40;
    }
    const unclicked = byResource.get(String(r._id))?.unclickedImpressions ?? 0;
    score *= Math.pow(decayFactor, unclicked);
    score += Math.random() * 40;
    return { resource: r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  if (scored.length === 0) return null;

  const best = scored[0].resource;
  const { ageDescription } = getResourceContext(best);
  const title = best.title || best.metadata?.title || "this resource";
  const truncatedTitle = title.length > 50 ? title.substring(0, 47) + "..." : title;

  const templates = [
    `Your highly-ranked save "${truncatedTitle}" from ${ageDescription} is waiting.`,
    `Based on your activity, "${truncatedTitle}" is a top priority today.`,
    `You've shown high interest in "${truncatedTitle}". Dive back in?`,
  ];

  return {
    resource: best,
    reason: templates[Math.floor(Math.random() * templates.length)],
    tier: 4 as const,
    selectionReason: "scored_fallback"
  };
}

async function coldStartPick(
  userId: string,
  resources: ResourceDoc[],
  getResourceContext: (r: ResourceDoc) => { typeText: string, ageDescription: string }
): Promise<RediscoverySuggestion | null> {
  if (resources.length === 0) return null;

  const recentLedger = await NotificationLedger.find({
    userId,
    createdAt: { $gte: new Date(Date.now() - 90 * DAY_MS) }
  }).lean();

  const shownMap = new Map(recentLedger.map(h => [String(h.resourceId), new Date(h.createdAt).getTime()]));

  const sorted = [...resources].sort((a, b) => {
    const aShown = shownMap.get(String(a._id)) ?? 0;
    const bShown = shownMap.get(String(b._id)) ?? 0;
    return aShown - bShown;
  });

  const picked = sorted[0];
  const { typeText, ageDescription } = getResourceContext(picked);

  return {
    resource: picked,
    reason: `A ${typeText} from your vault saved ${ageDescription}. Worth another look?`,
    tier: 3 as const,
    selectionReason: "cold_start"
  };
}

const DEFAULT_TIER_REASONS: Record<number, string> = {
  1: "tier1_default",
  2: "tier2_default",
  3: "tier3_default",
  4: "tier4_default",
};

export const getDailyFallbackNotification = async (userId: string): Promise<(RediscoverySuggestion & { wasEscapeHatch?: boolean; engagementLevel?: string; impressionCount?: number }) | null> => {
  const resources = await Resource.find({ userId, deletedAt: null, archived: false }).lean() as ResourceDoc[];
  if (resources.length < 5) {
    const pick = await coldStartPick(userId, resources, getResourceContext);
    if (pick) return { ...pick, engagementLevel: "engaged", impressionCount: 0 };
    return null;
  }

  const fullLedger = await NotificationLedger.find({
    userId,
    createdAt: { $gte: new Date(Date.now() - 90 * DAY_MS) }
  }).lean();

  const { byResource, user } = buildNotifState(fullLedger, resources);

  if (user.engagementLevel === "fatigued") return null;

  const recs = await getTieredRecommendations(userId);
  
  const searches = await SearchEvent.find({
    userId,
    createdAt: { $gte: new Date(Date.now() - 3 * DAY_MS) }
  }).lean();
  
  const searchCounts = new Map<string, number>();
  for (const s of searches) {
    const q = s.query.toLowerCase();
    searchCounts.set(q, (searchCounts.get(q) ?? 0) + 1);
  }
  const criticalQueries = new Set(
    [...searchCounts.entries()].filter(([_, count]) => count >= 6).map(([q]) => q)
  );

  const isCritical = (r: ResourceDoc): boolean => {
    const searchableText = [
      r.title?.toLowerCase() ?? "",
      ...(r.tags?.map(t => t.toLowerCase()) ?? [])
    ].join(" ");
    return [...criticalQueries].some(q => searchableText.includes(q));
  };

  const tierMap = new Map<number, RediscoverySuggestion[]>();
  const srSchedule = await computeSpacedSchedule(byResource, userId);

  for (const rec of recs) {
    const rid = String(rec.resource._id);
    const state = byResource.get(rid);

    if (state?.hibernatedUntil && Date.now() < state.hibernatedUntil) continue;

    const srDate = srSchedule.get(rid);
    if (srDate) {
      if (Date.now() < srDate.getTime()) continue;
      if (!tierMap.has(1)) tierMap.set(1, []);
      tierMap.get(1)!.push({ ...rec, tier: 1, selectionReason: "spaced_repetition" });
      continue;
    }

    const critical = isCritical(rec.resource);
    const onCooldown = state ? (critical ? state.onCriticalCooldown : state.onNormalCooldown) : false;
    if (onCooldown) continue;

    if (!tierMap.has(rec.tier)) tierMap.set(rec.tier, []);
    tierMap.get(rec.tier)!.push(rec);
  }

  const MAX_SAME_TAG = 2;
  const MAX_SAME_TYPE = 2;

  for (const [tier, candidates] of tierMap) {
    const filtered = candidates.filter(rec => {
      const r = rec.resource;
      if (r.type && (user.recentTypes.get(r.type) ?? 0) >= MAX_SAME_TYPE) return false;
      if (r.tags && r.tags.length > 0) {
        const allSaturated = r.tags.every(t => (user.recentTags.get(t) ?? 0) >= MAX_SAME_TAG);
        if (allSaturated) return false;
      }
      return true;
    });
    if (filtered.length > 0) tierMap.set(tier, filtered);
  }

  let picked = pickFromWeightedTiers(tierMap, byResource);
  let wasEscapeHatch = false;

  if (!picked && recs.length > 0) {
    const sorted = [...recs].sort((a, b) => {
      const aShown = byResource.get(String(a.resource._id))?.lastShownAt ?? 0;
      const bShown = byResource.get(String(b.resource._id))?.lastShownAt ?? 0;
      return aShown - bShown;
    });
    picked = sorted[0];
    wasEscapeHatch = true;
  }

  if (!picked) {
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
      picked = {
        resource: random,
        reason: templates[Math.floor(Math.random() * templates.length)],
        tier: 3 as const,
        selectionReason: "unread_random"
      };
    }
  }

  if (!picked && resources.length > 0) {
    picked = scoredFallbackPick(resources, byResource, getResourceContext);
  }

  if (picked) {
    const selectionReason = wasEscapeHatch
      ? "escape_hatch"
      : picked.selectionReason ?? (picked.tier ? DEFAULT_TIER_REASONS[picked.tier] : "unread_random");

    return { 
      ...picked, 
      selectionReason, 
      wasEscapeHatch,
      engagementLevel: user.engagementLevel,
      impressionCount: byResource.get(String(picked.resource._id))?.impressions ?? 0
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
