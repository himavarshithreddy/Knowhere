import { extractMetadata } from './services/metadata.js';

async function testUrl(url: string) {
  console.log(`\nTesting URL: ${url}`);
  try {
    const start = Date.now();
    const result = await extractMetadata(url);
    const end = Date.now();
    console.log(`Time taken: ${end - start}ms`);
    console.log(`Result:`, JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Error for ${url}:`, error);
  }
}

async function main() {
  await testUrl('https://medium.com/blog/is-chatgpt-causing-delusion-or-merely-holding-up-a-mirror-3949bb41249a');
  await testUrl('https://www.linkedin.com/in/himavarshithreddygundam/');
  await testUrl('https://razorpay.com/m/fix-my-itch/#all-problems');
  process.exit(0);
}

main();
