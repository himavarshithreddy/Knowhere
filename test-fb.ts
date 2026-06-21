import * as cheerio from "cheerio";

async function main() {
  const url = "https://www.instagram.com/p/C_1J5x0tJ1_/";
  const response = await fetch(url, {
    headers: {
      "user-agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)", 
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
