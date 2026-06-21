import * as cheerio from "cheerio";

async function main() {
  const url = "https://ddinstagram.com/p/C_1J5x0tJ1_/";
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", 
    }
  });
  console.log("Status:", response.status);
  const html = await response.text();
  const $ = cheerio.load(html);
  console.log("Title:", $("title").text());
  console.log("OG Title:", $('meta[property="og:title"]').attr("content") ?? $('meta[name="twitter:title"]').attr("content"));
  console.log("OG Desc:", $('meta[property="og:description"]').attr("content") ?? $('meta[name="twitter:description"]').attr("content"));
  console.log("OG Image:", $('meta[property="og:image"]').attr("content"));
}

main().catch(console.error);
