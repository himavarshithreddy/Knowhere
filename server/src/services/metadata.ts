import * as cheerio from "cheerio";
import { assertSafePublicUrl, safeFetch } from "../utils/security.js";
import { fetchWithBrowser } from "./browser.js";
import { LRUCache } from "lru-cache";

const metadataCache = new LRUCache<string, any>({
  max: 1000,
  ttl: 1000 * 60 * 60 * 24, // 24 hours caching
});

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

function isInstagramUrl(url: URL) {
  const host = url.hostname.replace(/^www\./, "");
  return host === "instagram.com";
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
  const cacheKey = url.toString();
  
  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey);
  }

  const socialPost = isXStatusUrl(url) || isLinkedInPostUrl(url);

  if (isXStatusUrl(url)) {
    const oembed = await fetchTwitterOEmbed(url.toString());
    if (oembed?.html) {
      const tweetText = extractTweetTextFromOembed(oembed.html);
      const result = {
        title: oembed.author_name ? `${oembed.author_name} on X` : "Post on X",
        description: tweetText || undefined,
        siteName: "X",
        author: oembed.author_name,
        faviconUrl: `${url.origin}/favicon.ico`
      };
      metadataCache.set(cacheKey, result);
      return result;
    }
  }

  if (isYouTubeUrl(url)) {
    const oembed = await fetchYouTubeOEmbed(url.toString());
    if (oembed?.title) {
      const result = {
        title: oembed.title,
        siteName: "YouTube",
        author: oembed.author_name,
        imageUrl: oembed.thumbnail_url,
        faviconUrl: `https://www.youtube.com/favicon.ico`
      };
      metadataCache.set(cacheKey, result);
      return result;
    }
  }

  if (isInstagramUrl(url)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const mlResponse = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url.toString())}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (mlResponse.ok) {
        const mlData = await mlResponse.json() as any;
        if (mlData.status === "success" && mlData.data) {
          const result = {
            title: mlData.data.title || "Instagram",
            description: mlData.data.description || undefined,
            siteName: "Instagram",
            author: mlData.data.author || undefined,
            imageUrl: mlData.data.image?.url || undefined,
            faviconUrl: mlData.data.logo?.url || `https://www.instagram.com/favicon.ico`
          };
          metadataCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (e) {
      console.warn("[Metadata] Microlink fetch failed for Instagram:", e instanceof Error ? e.message : String(e));
    }
  }

  const hostname = url.hostname.replace(/^www\./, "");
  
  // Site fingerprinting
  const playWrightOnlyDomains = ["notion.site", "notion.so"];
  const httpOnlyDomains = ["github.com", "medium.com"];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  
  try {
    let html = "";
    
    if (playWrightOnlyDomains.includes(hostname)) {
      throw new Error(`Site Fingerprint: Fast-tracking Playwright for ${hostname}`);
    }

    try {
      const response = await safeFetch(url.toString(), controller.signal);
      if (!response.ok) throw new Error(`Source returned ${response.status}.`);
      const length = Number(response.headers.get("content-length") ?? 0);
      if (length > 2_000_000) throw new Error("Page is too large to preview.");
      html = (await response.text()).slice(0, 2_000_000);
      
      // Advanced Bot Wall Detection
      if (
        html.includes("<title>Just a moment...</title>") || 
        html.includes("Enable JavaScript and cookies") ||
        html.includes("Please enable JS and disable any ad blocker") ||
        html.includes("Verify you are human") ||
        html.includes("cf-challenge") ||
        html.includes("PerimeterX") ||
        html.includes("DataDome") ||
        html.includes("g-recaptcha") ||
        (hostname === "medium.com" && !html.includes("og:title"))
      ) {
        throw new Error("Bot challenge or unrendered JS detected.");
      }
    } catch (tier1Error) {
      if (httpOnlyDomains.includes(hostname)) {
        throw new Error(`Site Fingerprint: ${hostname} is HTTP-only. Skipping Playwright fallback.`);
      }

      console.warn(`[Metadata] Tier 1 fetch failed for ${hostname}:`, tier1Error instanceof Error ? tier1Error.message : String(tier1Error));
      console.log(`[Metadata] Falling back to Tier 2 (Playwright) for ${hostname}`);
      
      clearTimeout(timeout); // We will rely on Playwright's timeout
      html = await fetchWithBrowser(url.toString(), 15000);
    }

    const $ = cheerio.load(html);
    const content = (property: string) =>
      $(`meta[property="${property}"]`).attr("content") ??
      $(`meta[name="${property}"]`).attr("content");
    const absolute = (candidate?: string) => {
      if (!candidate) return undefined;
      try { return new URL(candidate, url).toString(); } catch { return undefined; }
    };

    let title = content("og:title")
      ?? content("twitter:title")
      ?? $("title").first().text().trim();
      
    if (!title || title.toLowerCase() === hostname.toLowerCase()) {
      title = fallbackTitleFromUrl(url);
    }

    // LinkedIn Auth Wall Fallback
    if (title === "Sign Up | LinkedIn" || title === "LinkedIn Login, Sign in | LinkedIn" || title.includes("Log In") || title.includes("Login")) {
      const fallback = fallbackTitleFromUrl(url);
      if (fallback !== hostname) {
        title = fallback;
      }
    }

    const description = content("og:description")
      ?? content("twitter:description")
      ?? content("description");
    const imageUrl = pickPreviewImage([
      absolute(content("og:image:secure_url")),
      absolute(content("og:image")),
      absolute(content("twitter:image")),
      absolute(content("twitter:image:src"))
    ], url, socialPost);

    const domainParts = hostname.split(".");
    const siteName = content("og:site_name") ?? domainParts[domainParts.length - 2] ?? hostname;
    const siteNameCapitalized = siteName.charAt(0).toUpperCase() + siteName.slice(1);

    const result = {
      title,
      description: description?.trim() || undefined,
      imageUrl,
      faviconUrl: absolute($('link[rel~="icon"]').first().attr("href")) ?? `${url.origin}/favicon.ico`,
      siteName: siteNameCapitalized,
      author: content("author") ?? content("article:author")
    };
    
    metadataCache.set(cacheKey, result);
    return result;

  } catch (error) {
    const fallbackTitle = fallbackTitleFromUrl(url);
    const domainParts = hostname.split(".");
    const siteName = domainParts[domainParts.length - 2] ?? hostname;
    const siteNameCapitalized = siteName.charAt(0).toUpperCase() + siteName.slice(1);
    
    const result = {
      title: fallbackTitle,
      siteName: siteNameCapitalized,
      previewUnavailable: true
    };
    
    metadataCache.set(cacheKey, result);
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackTitleFromUrl(url: URL): string {
  const hostname = url.hostname.replace(/^www\./, "");
  const domainParts = hostname.split(".");
  const siteName = domainParts[domainParts.length - 2] || hostname;
  const siteNameCapitalized = siteName.charAt(0).toUpperCase() + siteName.slice(1);

  if (hostname.includes("linkedin.com") && url.pathname.startsWith("/in/")) {
    const parts = url.pathname.split("/").filter(Boolean);
    const username = parts[1];
    if (username) {
      const cleanName = username
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      return `${cleanName} | LinkedIn`;
    }
  }

  if (hostname.includes("medium.com")) {
    const parts = url.pathname.split("/").filter(Boolean);
    let slug = pathPartsLast(parts);
    if (slug) {
      slug = slug.replace(/-[a-f0-9]+$/, ""); 
      const cleanTitle = slug
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      return `${cleanTitle} | Medium`;
    }
  }

  if (hostname.includes("github.com")) {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]} | GitHub`;
    }
  }

  const pathParts = url.pathname.split("/").filter(Boolean);
  if (pathParts.length > 0) {
    let lastSegment = pathParts[pathParts.length - 1];
    lastSegment = lastSegment.replace(/\.[^/.]+$/, "").replace(/-[a-f0-9]{8,}$/i, "");
    const cleanSegment = lastSegment
      .split(/[-_]/)
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    
    if (cleanSegment.length > 2) {
      return `${cleanSegment} | ${siteNameCapitalized}`;
    }
  }

  return hostname;
}

function pathPartsLast(parts: string[]): string | undefined {
  return parts.length > 0 ? parts[parts.length - 1] : undefined;
}
