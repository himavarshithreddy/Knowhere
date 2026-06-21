async function main() {
  const url = "https://www.instagram.com/reels/DZyzCq0vwS8/?__a=1&__d=dis";
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", 
    }
  });
  console.log("Status:", response.status);
  const text = await response.text();
  console.log("Response:", text.substring(0, 500));
}

main().catch(console.error);
