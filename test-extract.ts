import { extractMetadata } from "./server/src/services/metadata.js";

async function main() {
  const url = "https://www.instagram.com/reels/DZyzCq0vwS8/";
  const result = await extractMetadata(url);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
