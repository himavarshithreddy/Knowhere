import { Router } from "express";
import webpush from "web-push";
import { requireAuth } from "../middleware/auth.js";
import crypto from "node:crypto";
import { User } from "../models/index.js";
import { NotificationLedger } from "../models/EventLog.js";
import { generatePushPayloadsForUser } from "../services/pushCron.js";
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

export function signAckToken(notifId: string): string {
  const hmac = crypto.createHmac("sha256", config.jwtSecret);
  hmac.update(notifId);
  return `${notifId}.${hmac.digest("hex")}`;
}

export function verifyAckToken(ackToken: string): string | null {
  const dotIndex = ackToken.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const notifId = ackToken.substring(0, dotIndex);
  const signature = ackToken.substring(dotIndex + 1);

  const hmac = crypto.createHmac("sha256", config.jwtSecret);
  hmac.update(notifId);
  const expected = hmac.digest("hex");

  if (signature.length !== expected.length) return null;
  const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  return valid ? notifId : null;
}

pushRouter.post("/ack", async (req, res) => {
  const { ackToken } = req.body;
  if (!ackToken || typeof ackToken !== "string") {
    return res.status(400).json({ error: "ackToken required" });
  }

  const notifId = verifyAckToken(ackToken);
  if (!notifId) {
    return res.status(403).json({ error: "Invalid token" });
  }

  try {
    await NotificationLedger.findByIdAndUpdate(notifId, {
      clicked: true,
      clickedAt: new Date(),
    });
  } catch (err) {
    console.error("[Push Ack] Failed to update ledger:", err);
  }

  res.json({ ok: true });
});

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
  console.log(`[Push Test] Received request to trigger test push from user uid: ${req.auth?.uid}`);
  const user = await User.findOne({ uid: req.auth!.uid });
  if (!user) {
    console.error(`[Push Test] User not found for uid: ${req.auth?.uid}`);
    return res.status(404).json({ error: "User not found." });
  }

  console.log(`[Push Test] User found. Subscriptions count: ${user.pushSubscriptions?.length || 0}`);
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
    console.log(`[Push Test] Sending test push to endpoint: ${sub.endpoint}`);
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys as any },
        payload,
        { headers: { Urgency: "high" }, TTL: 86400 }
      );
      console.log(`[Push Test] Successfully sent test notification to endpoint: ${sub.endpoint}`);
      sentCount++;
    } catch (err: any) {
      console.error(`[Push Test] Failed to send to endpoint ${sub.endpoint}:`, err);
      failCount++;
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.warn(`[Push Test] Subscription expired or gone (status ${err.statusCode}). Removing subscription.`);
        user.pushSubscriptions.splice(i, 1);
      }
    }
  }

  if (failCount > 0) {
    console.log(`[Push Test] Saving user push subscriptions updates after ${failCount} failures...`);
    await user.save();
  }

  res.json({ ok: true, sentCount, failCount });
});

pushRouter.post("/trigger-daily", async (req, res) => {
  console.log(`[Push Daily] Received request to trigger daily push from user uid: ${req.auth?.uid}`);
  const user = await User.findOne({ uid: req.auth!.uid });
  if (!user) {
    console.error(`[Push Daily] User not found for uid: ${req.auth?.uid}`);
    return res.status(404).json({ error: "User not found." });
  }

  console.log(`[Push Daily] User found. Subscriptions count: ${user.pushSubscriptions?.length || 0}`);
  if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) {
    return res.status(400).json({ error: "No active push subscriptions found." });
  }

  console.log(`[Push Daily] Generating recommendations for user: ${user.uid}`);
  const toSend = await generatePushPayloadsForUser(user.uid);
  console.log(`[Push Daily] Generated ${toSend.length} recommendations to send:`, JSON.stringify(toSend));
  
  if (toSend.length === 0) {
    return res.json({ ok: true, message: "No recommendations to send.", sentCount: 0 });
  }

  let sentCount = 0;
  let failCount = 0;
  for (const notif of toSend) {
    const payload = JSON.stringify(notif);
    for (let i = user.pushSubscriptions.length - 1; i >= 0; i--) {
      const sub = user.pushSubscriptions[i];
      console.log(`[Push Daily] Sending payload to endpoint: ${sub.endpoint}`);
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys as any }, 
          payload,
          { headers: { Urgency: "high" }, TTL: 86400 }
        );
        console.log(`[Push Daily] Successfully sent notification to endpoint: ${sub.endpoint}`);
        sentCount++;
      } catch (err: any) {
        console.error(`[Push Daily] Failed to send notification to endpoint ${sub.endpoint}:`, err);
        failCount++;
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.warn(`[Push Daily] Subscription expired or gone (status ${err.statusCode}). Removing subscription.`);
          user.pushSubscriptions.splice(i, 1);
        }
      }
    }
  }

  if (failCount > 0) {
    console.log(`[Push Daily] Saving user push subscriptions updates after ${failCount} failures...`);
  }
  await user.save();
  res.json({ ok: true, sentCount, failCount, sentPayloads: toSend });
});
