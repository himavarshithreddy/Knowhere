import { Router } from "express";
import webpush from "web-push";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/index.js";
import { config } from "../config.js";

// Initialize web-push with VAPID keys
try {
  webpush.setVapidDetails(
    config.vapidSubject,
    config.vapidPublicKey,
    config.vapidPrivateKey
  );
} catch (err) {
  console.warn("Failed to set VAPID details for web-push. Push notifications will not work.", err);
}

export const pushRouter = Router();

pushRouter.use(requireAuth);

pushRouter.get("/public-key", (req, res) => {
  res.json({ publicKey: config.vapidPublicKey });
});

pushRouter.post("/subscribe", async (req, res) => {
  const subscription = req.body;
  
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: "Invalid subscription object." });
  }

  const user = await User.findOne({ uid: req.auth!.uid });
  if (!user) return res.status(404).json({ error: "User not found." });

  // Ensure pushSubscriptions array exists
  if (!user.pushSubscriptions) {
    user.pushSubscriptions = [] as any;
  }

  // Check if endpoint already exists to avoid duplicates
  const existing = user.pushSubscriptions.find(sub => sub.endpoint === subscription.endpoint);
  if (!existing) {
    user.pushSubscriptions.push(subscription);
    await user.save();
  }

  res.status(201).json({ ok: true });
});

pushRouter.post("/unsubscribe", async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: "Endpoint required." });

  const user = await User.findOne({ uid: req.auth!.uid });
  if (!user) return res.status(404).json({ error: "User not found." });

  if (user.pushSubscriptions) {
    user.pushSubscriptions = user.pushSubscriptions.filter(sub => sub.endpoint !== endpoint) as any;
    await user.save();
  }

  res.json({ ok: true });
});

pushRouter.post("/test", async (req, res) => {
  const user = await User.findOne({ uid: req.auth!.uid });
  if (!user) return res.status(404).json({ error: "User not found." });

  if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) {
    return res.status(400).json({ error: "No active push subscriptions found for this user." });
  }

  const payload = JSON.stringify({
    title: "Test Connection",
    body: "This is a test push notification from Knowhere! It is working successfully.",
    url: "/dashboard"
  });

  let sentCount = 0;
  let failCount = 0;

  for (let i = user.pushSubscriptions.length - 1; i >= 0; i--) {
    const sub = user.pushSubscriptions[i];
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys as any },
        payload
      );
      sentCount++;
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        user.pushSubscriptions.splice(i, 1);
        failCount++;
      } else {
        console.error(`[Push Test] Failed to send:`, err);
        failCount++;
      }
    }
  }

  if (failCount > 0) {
    await user.save();
  }

  res.json({ ok: true, sentCount, failCount });
});
