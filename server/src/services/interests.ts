import { Resource, type ResourceDoc } from "../models/index.js";

export interface InterestCluster {
  topic: string;
  tags: string[];
  resourceCount: number;
  recentActivity: boolean;
}

export const getInterestMap = async (userId: string): Promise<InterestCluster[]> => {
  const resources = await Resource.find({
    userId,
    deletedAt: null,
    locked: false,
    archived: false,
  }).lean() as ResourceDoc[];

  if (resources.length === 0) return [];

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // We'll treat the first tag as the "topic" and the others as related.
  const clusterMap = new Map<string, { count: number; recent: boolean; tags: Set<string> }>();

  for (const r of resources) {
    if (!r.tags || r.tags.length === 0) continue;
    
    // Sort tags by frequency or just use the first one as primary. Let's just use the first as topic.
    const primary = r.tags[0].toLowerCase();
    
    if (!clusterMap.has(primary)) {
      clusterMap.set(primary, { count: 0, recent: false, tags: new Set() });
    }
    
    const cluster = clusterMap.get(primary)!;
    cluster.count++;
    
    const daysSinceCreated = (now - new Date(r.createdAt).getTime()) / dayMs;
    if (daysSinceCreated <= 14) {
      cluster.recent = true;
    }

    for (const t of r.tags) {
      cluster.tags.add(t.toLowerCase());
    }
  }

  const clusters: InterestCluster[] = Array.from(clusterMap.entries())
    .map(([topic, data]) => ({
      topic,
      tags: Array.from(data.tags),
      resourceCount: data.count,
      recentActivity: data.recent,
    }))
    // Sort by count (desc), then recent (true first)
    .sort((a, b) => b.resourceCount - a.resourceCount || (b.recentActivity ? 1 : -1) - (a.recentActivity ? 1 : -1));

  return clusters.slice(0, 15); // Return top 15 clusters
};

export const getRelatedResources = async (userId: string, tags: string[], excludeId?: string) => {
  if (!tags || tags.length === 0) return [];

  const query: any = {
    userId,
    deletedAt: null,
    tags: { $in: tags }
  };
  if (excludeId) query._id = { $ne: excludeId };

  return await Resource.find(query).sort({ createdAt: -1 }).limit(5).lean();
};
