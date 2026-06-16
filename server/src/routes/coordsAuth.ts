import { Router } from "express";
import { User } from "../models/index.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { setAuthCookie } from "../middleware/auth.js";
import { firebaseAuth } from "../firebase.js";
import { coordsLookup, hashCoords, parseCoords, verifyCoords } from "../services/coords.js";
import { findAvailableCoords } from "../services/coordsSuggestions.js";
import { ensureFirebaseRecoveryAccount } from "../services/firebaseRecovery.js";
import { createCoordsUser } from "../services/users.js";

const coordsProviders = ["code", "coords"] as const;
const recoveryMessage = "If an account exists for that email, a recovery link is on its way.";

export const coordsAuthRouter = Router();

coordsAuthRouter.get("/suggestions", rateLimit("coords-suggestions", 30, 60_000), async (req, res) => {
  const count = Math.min(Math.max(Number(req.query.count ?? 4), 1), 8);
  const suggestions = await findAvailableCoords(count);
  if (suggestions.length < count) {
    return res.status(503).json({ error: "Could not find enough available Coords. Try again." });
  }
  res.json({ suggestions });
});

coordsAuthRouter.post("/enter", rateLimit("coords-enter", 20, 60_000), async (req, res) => {
  const coords = parseCoords(String(req.body.coords ?? req.body.code ?? ""));
  if (!coords) return res.status(400).json({ error: "Coords look like AB-1234 — two letters and four numbers." });

  const email = String(req.body.email ?? "").trim().toLowerCase();
  const lookup = coordsLookup(coords);
  const existing = await User.findOne({ accessCodeLookup: lookup, authProvider: { $in: coordsProviders } });

  if (existing) {
    if (!existing.accessCodeHash || !(await verifyCoords(coords, existing.accessCodeHash))) {
      return res.status(401).json({ error: "Those Coords did not match." });
    }
    setAuthCookie(res, existing.uid);
    return res.json({ ok: true });
  }

  if (!email) return res.json({ needsEmail: true });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid recovery email." });
  }

  const idToken = String(req.body.idToken ?? "");
  if (!idToken) return res.status(400).json({ error: "Account verification is required." });

  try {
    const decoded = await firebaseAuth().verifyIdToken(idToken);
    const tokenEmail = decoded.email?.trim().toLowerCase();
    if (!tokenEmail || tokenEmail !== email) {
      return res.status(400).json({ error: "Recovery email does not match verification." });
    }

    const user = await createCoordsUser(coords, email, decoded.uid);
    setAuthCookie(res, user.uid);
    res.status(201).json({ ok: true, created: true });
  } catch (error) {
    if (idToken) {
      try {
        const decoded = await firebaseAuth().verifyIdToken(idToken);
        await firebaseAuth().deleteUser(decoded.uid).catch(() => undefined);
      } catch { /* ignore cleanup errors */ }
    }
    res.status(400).json({ error: error instanceof Error ? error.message : "Could not open Knowhere." });
  }
});

coordsAuthRouter.post("/recover/prepare", rateLimit("coords-recover", 5, 60_000), async (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }

  const user = await User.findOne({ email, authProvider: { $in: coordsProviders } });
  if (user) {
    try {
      user.firebaseUid = await ensureFirebaseRecoveryAccount(email, user.firebaseUid);
      await user.save();
    } catch {
      // Still return a generic message — do not reveal account state.
    }
  }

  res.json({ ok: true, message: recoveryMessage });
});

coordsAuthRouter.post("/recover/complete", rateLimit("coords-recover-complete", 10, 60_000), async (req, res) => {
  const idToken = String(req.body.idToken ?? "");
  const coords = parseCoords(String(req.body.coords ?? ""));
  if (!idToken) return res.status(400).json({ error: "Recovery verification is required." });
  if (!coords) return res.status(400).json({ error: "Coords look like AB-1234 — two letters and four numbers." });

  try {
    const decoded = await firebaseAuth().verifyIdToken(idToken);
    const email = decoded.email?.trim().toLowerCase();
    if (!email) return res.status(401).json({ error: "Recovery verification failed." });

    const user = await User.findOne({ email, authProvider: { $in: coordsProviders } });
    if (!user) return res.status(404).json({ error: "No Coords account found for this email." });
    if (user.firebaseUid && user.firebaseUid !== decoded.uid) {
      return res.status(403).json({ error: "Recovery verification failed." });
    }

    const lookup = coordsLookup(coords);
    const taken = await User.findOne({ accessCodeLookup: lookup, uid: { $ne: user.uid } });
    if (taken) return res.status(400).json({ error: "Those Coords are already claimed. Try another pair." });

    user.accessCodeLookup = lookup;
    user.accessCodeHash = await hashCoords(coords);
    user.displayName = coords;
    if (!user.firebaseUid) user.firebaseUid = decoded.uid;
    await user.save();

    setAuthCookie(res, user.uid);
    res.json({ ok: true, coords });
  } catch {
    res.status(401).json({ error: "Invalid or expired recovery link. Request a new one." });
  }
});
