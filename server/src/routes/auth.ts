import { Router } from "express";
import { clearAuthCookie, requireAuth, setAuthCookie } from "../middleware/auth.js";
import { firebaseAuth } from "../firebase.js";
import { User } from "../models/index.js";
import { bootstrapGoogleUser } from "../services/users.js";
import { userToProfile } from "../utils/serialize.js";

export const authRouter = Router();

authRouter.post("/session", async (req, res) => {
  const idToken = String(req.body.idToken ?? "");
  if (!idToken) return res.status(400).json({ error: "ID token is required." });

  try {
    const decoded = await firebaseAuth().verifyIdToken(idToken);
    await bootstrapGoogleUser(decoded);
    setAuthCookie(res, decoded.uid);
    res.json({ ok: true });
  } catch {
    res.status(401).json({ error: "Invalid or expired sign-in. Try again." });
  }
});

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await User.findOne({ uid: req.auth!.uid });
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    authProvider: user.authProvider,
    profile: userToProfile(user)
  });
});
