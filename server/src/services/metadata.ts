import * as cheerio from "cheerio";
import { assertSafePublicUrl, safeFetch } from "../utils/security.js";

function isProfilePreviewImage(imageUrl?: string) {
  if (!imageUrl) return false;
  const lower = imageUrl.toLowerCase();
  return lower.includes("profile_images")
    || lower.includes("profile-displayphoto")
    || /pbs\.twimg\.com\/profile_images\//i.test(imageUrl)
    || /licdn\.com.*profile-displayphoto/i.test(imageUrl);
}

function isXStatusUrl(url: URL) {
  const host = url.hostname.replace(/^www\./, "");
  if (!["x.com", "twitter.com", "mobile.twitter.com"].includes(host)) return false;
  return /\/status\/\d+/i.test(url.pathname);
}

function isLinkedInPostUrl(url: URL) {
  if (!url.hostname.includes("linkedin.com")) return false;
  return /\/(posts|feed\/update|pulse)\//i.test(url.pathname)
    || url.pathname.includes("/activity-");
}

function isYouTubeUrl(url: URL) {
  const host = url.hostname.replace(/^www\./, "");
  return host === "youtube.com" || host === "youtu.be";
}

function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractTweetTextFromOembed(html: string) {
  const paragraph = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  return htmlToText(paragraph ?? html);
}

async function fetchTwitterOEmbed(pageUrl: string) {
  const endpoint = `https://publish.twitter.com/oembed?url=${encodeURIComponent(pageUrl)}&omit_script=1&hide_thread=1`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "KnowherePreview/1.0" }
    });
    if (!response.ok) return null;
    return await response.json() as { html?: string; author_name?: string };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchYouTubeOEmbed(pageUrl: string) {
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(pageUrl)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "KnowherePreview/1.0" }
    });
    if (!response.ok) return null;
    return await response.json() as { title?: string; author_name?: string; thumbnail_url?: string };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function pickPreviewImage(
  candidates: Array<string | undefined>,
  url: URL,
  socialPost: boolean
) {
  for (const candidate of candidates) {
    if (!candidate || isProfilePreviewImage(candidate)) continue;
    if (socialPost && isXStatusUrl(url)) continue;
    return candidate;
  }
  return undefined;
}

export async function extractMetadata(rawUrl: string) {
  const url = await assertSafePublicUrl(rawUrl);
  const socialPost = isXStatusUrl(url) || isLinkedInPostUrl(url);

  if (isXStatusUrl(url)) {
    const oembed = await fetchTwitterOEmbed(url.toString());
    if (oembed?.html) {
      const tweetText = extractTweetTextFromOembed(oembed.html);
      return {
        title: oembed.author_name ? `${oembed.author_name} on X` : "Post on X",
        description: tweetText || undefined,
        siteName: "X",
        author: oembed.author_name,
        faviconUrl: `${url.origin}/favicon.ico`
      };
    }
  }

  if (isYouTubeUrl(url)) {
    const oembed = await fetchYouTubeOEmbed(url.toString());
    if (oembed?.title) {
      return {
        title: oembed.title,
        siteName: "YouTube",
        author: oembed.author_name,
        imageUrl: oembed.thumbnail_url,
        faviconUrl: `https://www.youtube.com/favicon.ico`
      };
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await safeFetch(url.toString(), controller.signal);
    if (!response.ok) throw new Error(`Source returned ${response.status}.`);
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > 2_000_000) throw new Error("Page is too large to preview.");
    const html = (await response.text()).slice(0, 2_000_000);
    const $ = cheerio.load(html);
    const content = (property: string) =>
      $(`meta[property="${property}"]`).attr("content") ??
      $(`meta[name="${property}"]`).attr("content");
    const absolute = (candidate?: string) => {
      if (!candidate) return undefined;
      try { return new URL(candidate, url).toString(); } catch { return undefined; }
    };

    const title = content("og:title")
      ?? content("twitter:title")
      ?? $("title").first().text().trim()
      ?? url.hostname.replace(/^www\./, "");
    const description = content("og:description")
      ?? content("twitter:description")
      ?? content("description");
    const imageUrl = pickPreviewImage([
      absolute(content("og:image:secure_url")),
      absolute(content("og:image")),
      absolute(content("twitter:image")),
      absolute(content("twitter:image:src"))
    ], url, socialPost);

    return {
      title,
      description: description?.trim() || undefined,
      imageUrl,
      faviconUrl: absolute($('link[rel~="icon"]').first().attr("href")) ?? `${url.origin}/favicon.ico`,
      siteName: content("og:site_name") ?? url.hostname.replace(/^www\./, ""),
      author: content("author") ?? content("article:author")
    };
  } catch {
    return {
      title: url.hostname.replace(/^www\./, ""),
      siteName: url.hostname,
      previewUnavailable: true
    };
  } finally {
    clearTimeout(timeout);
  }
}
