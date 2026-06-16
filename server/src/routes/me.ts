import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/index.js";
import { userToProfile } from "../utils/serialize.js";

export const meRouter = Router();
meRouter.use(requireAuth);

meRouter.get("/", async (req, res) => {
  const user = await User.findOne({ uid: req.auth!.uid });
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json(userToProfile(user));
});

meRouter.patch("/", async (req, res) => {
  const user = await User.findOne({ uid: req.auth!.uid });
  if (!user) return res.status(404).json({ error: "User not found." });

  if (typeof req.body.onboardingComplete === "boolean") {
    user.onboardingComplete = req.body.onboardingComplete;
  }

  const preferences = req.body.preferences ?? req.body;
  for (const key of ["density", "view", "lastCategoryId"] as const) {
    if (preferences[key] !== undefined) {
      user.preferences ??= { density: "comfortable", view: "grid" };
      user.preferences[key] = preferences[key];
    }
  }

  await user.save();
  res.json(userToProfile(user));
});
