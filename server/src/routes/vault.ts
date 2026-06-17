import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { User, Resource } from "../models/index.js";

export const vaultRouter = Router();
vaultRouter.use(requireAuth);

vaultRouter.post("/setup", async (req, res) => {
  const { pin } = req.body;
  if (!pin || typeof pin !== "string" || pin.length !== 4) {
    return res.status(400).json({ error: "Invalid PIN format." });
  }

  const user = await User.findOne({ uid: req.auth!.uid });
  if (!user) return res.status(404).json({ error: "User not found." });

  if (user.vaultPin) {
    return res.status(400).json({ error: "Vault PIN is already setup." });
  }

  user.vaultPin = pin;
  await user.save();

  res.json({ ok: true });
});

vaultRouter.post("/verify", async (req, res) => {
  const { pin } = req.body;
  if (!pin || typeof pin !== "string") {
    return res.status(400).json({ error: "PIN required." });
  }

  const user = await User.findOne({ uid: req.auth!.uid });
  if (!user) return res.status(404).json({ error: "User not found." });

  if (user.vaultPin !== pin) {
    return res.status(401).json({ error: "Incorrect PIN." });
  }

  res.json({ ok: true });
});

vaultRouter.post("/reset", async (req, res) => {
  const user = await User.findOne({ uid: req.auth!.uid });
  if (!user) return res.status(404).json({ error: "User not found." });

  // Clear PIN
  user.vaultPin = undefined;
  await user.save();

  // Permanently delete all locked resources
  await Resource.deleteMany({ userId: req.auth!.uid, locked: true });

  res.json({ ok: true });
});
