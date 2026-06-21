import cron from "node-cron";
import webpush from "web-push";
import OpenAI from "openai";
import { User, Resource } from "../models/index.js";
import { getDailyFallbackNotification } from "./rediscovery.js";
import { config } from "../config.js";
import { createChatCompletionWithDynamicTokens } from "../utils/ai.js";

let ai: OpenAI | null = null;
if (config.openRouterKey) {
  ai = new OpenAI({ 
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: config.openRouterKey 
  });
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
            const response = await createChatCompletionWithDynamicTokens(
              ai,
              {
                model: "google/gemini-2.5-flash",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
              },
              200
            );
            const content = response.choices[0]?.message?.content;
            if (content) body = content.trim();
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
    const resourceDesc = fallback.resource.description 
      || fallback.resource.aiDescription 
      || fallback.resource.metadata?.description 
      || "";
    let body = fallback.reason;
    
    if (ai) {
      try {
        const styles = [
          "Phrase this as a direct, slightly sarcastic question about why they haven't touched this yet.",
          "Phrase this as a commanding statement highlighting the risk of letting this knowledge go to waste.",
          "Phrase this as a short, high-energy prompt forcing them to act right now.",
          "Phrase this as a brief reality check pointing out exactly how much time has passed since they hoarded it."
        ];
        const randomStyle = styles[Math.floor(Math.random() * styles.length)];

        const vibes = [
          "Vibe constraint: Aggressive accountability. Challenge them directly on why they hoarded this.",
          "Vibe constraint: Socratic questioning. Make them reflect on whether this resource is still worth keeping or if it is dead weight.",
          "Vibe constraint: High-intensity enthusiasm. Fire them up about the potential of what they can build or learn from this.",
          "Vibe constraint: Pragmatic realism. Remind them that reviewing this now takes less than 3 minutes, whereas hoarding it forever is a mental tax.",
          "Vibe constraint: Curiosity gap. Focus on what they might have forgotten or what mystery lies inside this resource.",
          "Vibe constraint: Intent alignment. Ask if their current projects could benefit from this specific resource right now.",
          "Vibe constraint: Cognitive relief. Emphasize how satisfying it will feel to check this off their mental backlog.",
          "Vibe constraint: Uncompromising focus. Force them to choose between opening it now or deleting it from their vault."
        ];
        const randomVibe = vibes[Math.floor(Math.random() * vibes.length)];
        const entropySeed = Math.random().toString(36).substring(7);

        const prompt = `You are Nebula, an AI intelligence layer powering a contextual recommendation system for Knowhere. Write a highly compelling, punchy push notification body (1 to 2 short sentences, max 120 characters) to push the user to act.

Resource Title: "${resourceTitle}"
Resource Description: "${resourceDesc}"
Nebula Context: "${fallback.reason}"
Tier: ${fallback.tier}
Entropy Seed: "${entropySeed}"

Instructions:
1. Use the specific facts provided in the "Nebula Context" to tailor the notification specifically to this item.
2. Focus heavily on the Resource Title and Resource Description to construct your message. Use concrete details from what this resource is actually about (from its description or tags) to make the motivation highly specific and relevant.
3. ${randomStyle}
4. ${randomVibe}
5. Use an urgent, direct, and slightly challenging tone to break their procrastination. Wake them up.
6. You may creatively reference the title or topic, but keep the overall length extremely punchy (under 120 characters).
7. Do not use quotes or emojis under any circumstances.`;
        const response = await createChatCompletionWithDynamicTokens(
          ai,
          {
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.95
          },
          200
        );
        const content = response.choices[0]?.message?.content;
        if (content) body = content.trim();
      } catch (e) { /* ignore and fallback */ }
    }

    const shortTitle = resourceTitle.length > 40 ? resourceTitle.substring(0, 37) + "..." : resourceTitle;
    notificationsToSend.push({
      title: `Nebula: ${shortTitle}`,
      body,
      url: `/library?resource=${fallback.resource._id}`
    });
  }

  return notificationsToSend.slice(0, 2);
};

export const startPushCron = () => {
  const runPushJob = async () => {
    console.log("[Push Cron] Running push notification job...");

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
      
      console.log("[Push Cron] Push job completed.");
    } catch (err) {
      console.error("[Push Cron] Error running push job:", err);
    }
  };

  // Run every day at 11:00 AM
  cron.schedule("0 11 * * *", runPushJob);
  
  // Run every day at 7:00 PM (19:00)
  cron.schedule("0 19 * * *", runPushJob);
};
