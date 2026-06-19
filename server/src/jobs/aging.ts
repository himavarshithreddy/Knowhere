import { Resource } from "../models/index.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function runAgingJob() {
  console.log("[Aging Job] Starting...");
  const now = Date.now();
  let updatedCount = 0;

  // Find resources that might need aging updates
  const resources = await Resource.find({
    intentType: "mission",
    actionStatus: { $in: ["saved", "in_progress"] },
    deletedAt: null,
    archived: false,
    locked: false,
  });

  for (const r of resources) {
    const daysSinceSaved = (now - new Date(r.createdAt).getTime()) / DAY_MS;
    const daysSinceLastView = r.lastViewedAt
      ? (now - new Date(r.lastViewedAt).getTime()) / DAY_MS
      : daysSinceSaved;

    let needsUpdate = false;

    if (r.actionStatus === "saved") {
      if (daysSinceSaved >= 90) {
        // Auto-transition to dormant
        r.actionStatus = "dormant";
        r.lastStatusChangeAt = new Date();
        needsUpdate = true;
      }
    } else if (r.actionStatus === "in_progress") {
      if (daysSinceLastView >= 30) {
        // Here we could add a specific flag if we had one, e.g. `isStalling: true`.
        // The implementation plan says "Set flag: aging: stalling".
        // But our schema doesn't have an `aging` field. 
        // For now, we will rely on UI calculation (if daysActive > 30 and no views -> warning).
        // If we strictly want to track it, we can use `actionStatus = dormant` or just keep it in progress and let the dashboard flag it.
        // Let's auto-dormant it if it's been stalled for 90 days.
        if (daysSinceLastView >= 90) {
          r.actionStatus = "dormant";
          r.lastStatusChangeAt = new Date();
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      await r.save();
      updatedCount++;
    }
  }

  console.log(`[Aging Job] Completed. Updated ${updatedCount} missions.`);
}

export function startAgingJob() {
  // Run once immediately on start (for demo purposes we can skip, but good for testing)
  // setTimeout(runAgingJob, 10000);

  // Run every day at 3 AM
  setInterval(() => {
    const date = new Date();
    if (date.getHours() === 3 && date.getMinutes() === 0) {
      runAgingJob().catch(console.error);
    }
  }, 60 * 1000); // Check every minute
}
