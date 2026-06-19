import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getActiveMissions, getBrokenPromises, getTransmissions, getOpportunities, getWeeklyRecap } from "../services/rediscovery.js";
import { generateDashboardIntelligence } from "../services/analytics.js";
import { resourceToApi } from "../utils/serialize.js";
import type { ResourceDoc } from "../models/index.js";

export const rediscoveryRouter = Router();
rediscoveryRouter.use(requireAuth);

rediscoveryRouter.get("/dashboard", async (req, res) => {
  const userId = req.auth!.uid;

  const [transmissions, activeMissions, brokenPromises, opportunities, weeklyRecap, intelligence] = await Promise.all([
    getTransmissions(userId),
    getActiveMissions(userId),
    getBrokenPromises(userId),
    getOpportunities(userId),
    getWeeklyRecap(userId),
    generateDashboardIntelligence(userId)
  ]);

  res.json({
    transmissions: transmissions.map(t => ({
      resource: resourceToApi(t.resource as ResourceDoc),
      reason: t.reason
    })),
    activeMissions: activeMissions.map(r => resourceToApi(r as ResourceDoc)),
    brokenPromises: brokenPromises.map(r => resourceToApi(r as ResourceDoc)),
    opportunities: opportunities.map(r => resourceToApi(r as ResourceDoc)),
    weeklyRecap,
    intelligence
  });
});
