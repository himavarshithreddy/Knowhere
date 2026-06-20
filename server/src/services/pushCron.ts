import cron from "node-cron";
import webpush from "web-push";
import { GoogleGenAI } from "@google/genai";
import { User, Resource } from "../models/index.js";
import { getDailyFallbackNotification } from "./rediscovery.js";
import { config } from "../config.js";

let ai: GoogleGenAI | null = null;
if (config.geminiApiKey) {
  ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
}

export const generatePushPayloadsForUser = async (userId: string) => {
  const notificationsToSend: { title: string; body: string; url: string }[] = [];
  
  // 1. Check for overdue missions
  const activeMissions = await Resource.find({
    userId,
    intentType: "mission",
    actionStatus: "in_progress",
    deletedAt: null,
    archived: false,
    locked: false,
    targetDate: { $ne: null }
  }).lean();

  const today = new Date();
  let hasMissionNotif = false;
  
  for (const mission of activeMissions) {
    if (mission.targetDate) {
      const daysLeft = Math.ceil((new Date(mission.targetDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if ((daysLeft < 0 && daysLeft >= -3) || daysLeft === 0) {
        let body = daysLeft === 0 
          ? `"${mission.title}" is due today. Let's get it done.` 
          : `"${mission.title}" was due ${Math.abs(daysLeft)} days ago.`;

        if (ai) {
          try {
            const prompt = `You are Knowhere, an uncompromising AI mission control. The user has a mission named "${mission.title}" that is ${daysLeft === 0 ? "due today" : `overdue by ${Math.abs(daysLeft)} days`}.
Write a highly intense, urgent, and punchy push notification body (1 to 2 short sentences, max 120 characters) that holds them strictly accountable, breaks their procrastination, and pushes them to work immediately. Use a commanding, direct tone that makes procrastination uncomfortable. Do not include the title in the body. Do not use quotes. Do not use emojis under any circumstances.`;
            const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { temperature: 0.7 } });
            if (response.text) body = response.text.trim();
          } catch (e) { /* ignore and fallback */ }
        }

        notificationsToSend.push({
          title: daysLeft === 0 ? "Mission Due Today" : "Overdue Mission",
          body,
          url: `/missions`
        });
        hasMissionNotif = true;
        break; // Only send max 1 mission notification
      }
    }
  }

  // 2. Nebula Recommendation
  const fallback = await getDailyFallbackNotification(userId);
  if (fallback) {
    const resourceTitle = fallback.resource.title || fallback.resource.metadata?.title || "this forgotten item";
    let body = fallback.reason;
    
    if (ai) {
      try {
        const prompt = `You are Nebula, an AI intelligence layer powering a contextual recommendation system for Knowhere. Write a highly compelling, punchy push notification body (1 to 2 short sentences, max 120 characters) to push the user to act.
Resource: "${resourceTitle}"
Nebula Reason: "${fallback.reason}"
Tier: ${fallback.tier}
Use an urgent, direct, and slightly challenging tone to break their procrastination. Wake them up. Do not include the title in the body. Do not use quotes. Do not use emojis under any circumstances.`;
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { temperature: 0.7 } });
        if (response.text) body = response.text.trim();
      } catch (e) { /* ignore and fallback */ }
    }

    notificationsToSend.push({
      title: "Nebula",
      body,
      url: `/library?resource=${fallback.resource._id}`
    });
  }

  return notificationsToSend.slice(0, 2);
};

export const startPushCron = () => {
  // Run every day at 11:00 AM
  cron.schedule("0 11 * * *", async () => {
    console.log("[Push Cron] Running daily push notification job...");

    try {
      const usersWithPush = await User.find({ "pushSubscriptions.0": { $exists: true } });

      for (const user of usersWithPush) {
        if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) continue;

        const toSend = await generatePushPayloadsForUser(user.uid);

        for (const notif of toSend) {
          const payload = JSON.stringify(notif);
          
          for (let i = user.pushSubscriptions.length - 1; i >= 0; i--) {
            const sub = user.pushSubscriptions[i];
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: sub.keys as any },
                payload
              );
            } catch (err: any) {
              if (err.statusCode === 410 || err.statusCode === 404) {
                user.pushSubscriptions.splice(i, 1);
              } else {
                console.error(`[Push Cron] Failed to send to endpoint ${sub.endpoint}:`, err);
              }
            }
          }
        }

        await user.save();
      }
      
      console.log("[Push Cron] Daily push job completed.");
    } catch (err) {
      console.error("[Push Cron] Error running push job:", err);
    }
  });
};
