async function main() {
  const url = "https://www.instagram.com/reels/DZyzCq0vwS8/";
  const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
  console.log("Status:", response.status);
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
