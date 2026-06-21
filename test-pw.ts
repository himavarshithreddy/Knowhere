import { fetchWithBrowser } from "./server/src/services/browser.js";
import * as cheerio from "cheerio";

async function main() {
  const url = "https://www.instagram.com/p/C_1J5x0tJ1_/";
  const html = await fetchWithBrowser(url, 15000);
  const $ = cheerio.load(html);
  console.log("Title:", $("title").text());
  console.log("OG Title:", $('meta[property="og:title"]').attr("content"));
  console.log("OG Desc:", $('meta[property="og:description"]').attr("content"));
  console.log("OG Image:", $('meta[property="og:image"]').attr("content"));
}

main().catch(console.error);
