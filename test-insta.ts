import { extractMetadata } from "./server/src/services/metadata.js";

async function main() {
  const url = "https://www.instagram.com/p/C_1J5x0tJ1_/";
  const metadata = await extractMetadata(url);
  console.log(JSON.stringify(metadata, null, 2));
}

main().catch(console.error);
