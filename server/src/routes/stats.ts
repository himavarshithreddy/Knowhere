import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Resource, type ResourceDoc } from "../models/index.js";

export const statsRouter = Router();
statsRouter.use(requireAuth);

statsRouter.get("/", async (req, res) => {
  const userId = req.auth!.uid;

  const resources = await Resource.find({
    userId,
    deletedAt: null,
    archived: false,
    locked: false
  }).lean() as ResourceDoc[];

  const byIntent = { knowledge: 0, project: 0, idea: 0, goal: 0 };
  const byStatus = { saved: 0, reviewed: 0, in_progress: 0, completed: 0, dormant: 0, archived: 0 };

  let actionableTotal = 0;
  let actionedCount = 0;
  let missionTotal = 0;
  let completedCount = 0;
  let forgottenCount = 0;

  const now = Date.now();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

  for (const r of resources) {
    // Intent
    if (byIntent[r.intentType as keyof typeof byIntent] !== undefined) {
      byIntent[r.intentType as keyof typeof byIntent]++;
    }

    // Status
    if (byStatus[r.actionStatus as keyof typeof byStatus] !== undefined) {
      byStatus[r.actionStatus as keyof typeof byStatus]++;
    }

    // Action Rate (anything not just 'saved')
    actionableTotal++;
    if (r.actionStatus !== "saved") {
      actionedCount++;
    }

    // Completion Rate
    if (r.intentType === "mission") {
      missionTotal++;
      if (r.actionStatus === "completed") {
        completedCount++;
      }
    }

    // Forgotten Count
    const daysSinceLastView = r.lastViewedAt
      ? (now - new Date(r.lastViewedAt).getTime())
      : (now - new Date(r.createdAt).getTime());
    if (daysSinceLastView > ninetyDaysMs && r.actionStatus === "saved") {
      forgottenCount++;
    }
  }

  res.json({
    total: actionableTotal,
    byIntent,
    byStatus,
    actionRate: actionableTotal > 0 ? actionedCount / actionableTotal : 0,
    completionRate: missionTotal > 0 ? completedCount / missionTotal : 0,
    forgottenCount
  });
});
