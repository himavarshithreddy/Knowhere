import * as cheerio from "cheerio";

async function main() {
  const url = "https://www.instagram.com/p/DZyzCq0vwS8/embed/";
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", 
    }
  });
  console.log("Status:", response.status);
  const html = await response.text();
  const $ = cheerio.load(html);
  console.log("Title:", $("title").text());
  
  // Extract script text to see if there's JSON
  const scripts = $("script").toArray();
  for (const s of scripts) {
    const content = $(s).html();
    if (content && content.includes("window.__additionalDataLoaded")) {
      console.log("Found additionalDataLoaded length:", content.length);
      const match = content.match(/window\.__additionalDataLoaded\([^,]+,\s*({.+})\);/);
      if (match) {
        const data = JSON.parse(match[1]);
        const media = data?.shortcode_media;
        if (media) {
          console.log("Extracted username:", media.owner?.username);
        }
      }
    }
  }
}

main().catch(console.error);
