import cron from "node-cron";
import webpush from "web-push";
import { GoogleGenAI } from "@google/genai";
import { User, Resource } from "../models/index.js";
import { getTransmissions } from "./rediscovery.js";
import { config } from "../config.js";

let ai: GoogleGenAI | null = null;
if (config.geminiApiKey) {
  ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
}

export const startPushCron = () => {
  // Run every day at 11:00 AM
  // For testing purposes, you could change this to "* * * * *" (every minute)
  cron.schedule("0 11 * * *", async () => {
    console.log("[Push Cron] Running daily push notification job...");

    try {
      // Find all users with active push subscriptions
      const usersWithPush = await User.find({ "pushSubscriptions.0": { $exists: true } });

      for (const user of usersWithPush) {
        if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) continue;

        const userId = user.uid;
        const notificationsToSend: { title: string; body: string; url: string }[] = [];

        // 1. Check for high-scoring transmissions
        const transmissions = await getTransmissions(userId);
        if (transmissions.length > 0) {
          const topTransmission = transmissions[0];
          if (topTransmission.score > 40) {
            const resourceTitle = topTransmission.resource.title || topTransmission.resource.metadata?.title || "this forgotten item";
            let body = topTransmission.reason;
            
            if (ai) {
              try {
                const prompt = `You are Knowhere, a private AI vault. Write a short, motivating, 1-sentence push notification body (max 100 chars) to remind the user of an old resource they saved.
Resource: "${resourceTitle}"
Reason it surfaced: "${topTransmission.reason}"
Make it engaging, mysterious, or highly relevant. Do not include the title in the body. Do not use quotes. Do not use emojis under any circumstances.`;
                const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { temperature: 0.7 } });
                if (response.text) body = response.text.trim();
              } catch (e) { /* ignore and fallback */ }
            }

            notificationsToSend.push({
              title: "Rediscovery",
              body,
              url: `/library?resource=${topTransmission.resource._id}`
            });
          }
        }

        // 2. Check for overdue missions
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
        for (const mission of activeMissions) {
          if (mission.targetDate) {
            const daysLeft = Math.ceil((new Date(mission.targetDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            if ((daysLeft < 0 && daysLeft >= -3) || daysLeft === 0) {
              let body = daysLeft === 0 
                ? `"${mission.title}" is due today. Let's get it done.` 
                : `"${mission.title}" was due ${Math.abs(daysLeft)} days ago.`;

              if (ai) {
                try {
                  const prompt = `You are Knowhere, an AI vault that acts like a mission control. The user has a project/goal named "${mission.title}" that is ${daysLeft === 0 ? "due today" : `overdue by ${Math.abs(daysLeft)} days`}. 
Write a short, highly motivating, 1-sentence push notification body (max 100 chars) to get them to take action. Do not include the title in the body. Use a tone that is encouraging but holds them accountable. Do not use quotes. Do not use emojis under any circumstances.`;
                  const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { temperature: 0.7 } });
                  if (response.text) body = response.text.trim();
                } catch (e) { /* ignore and fallback */ }
              }

              notificationsToSend.push({
                title: daysLeft === 0 ? "Mission Due Today" : "Overdue Mission",
                body,
                url: `/missions`
              });
            }
          }
        }

        // Send a max of 2 notifications per user per day so we don't spam
        const toSend = notificationsToSend.slice(0, 2);

        for (const notif of toSend) {
          const payload = JSON.stringify(notif);
          
          // Send to all of the user's registered devices
          for (let i = user.pushSubscriptions.length - 1; i >= 0; i--) {
            const sub = user.pushSubscriptions[i];
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: sub.keys as any },
                payload
              );
            } catch (err: any) {
              // If subscription is invalid/expired (410 or 404), remove it
              if (err.statusCode === 410 || err.statusCode === 404) {
                user.pushSubscriptions.splice(i, 1);
              } else {
                console.error(`[Push Cron] Failed to send to endpoint ${sub.endpoint}:`, err);
              }
            }
          }
        }

        // Save if any expired subscriptions were removed
        await user.save();
      }
      
      console.log("[Push Cron] Daily push job completed.");
    } catch (err) {
      console.error("[Push Cron] Error running push job:", err);
    }
  });
};
