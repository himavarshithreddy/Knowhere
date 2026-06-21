import dns from "node:dns/promises";
import net from "node:net";

const blockedHosts = new Set(["localhost", "metadata.google.internal"]);

export function isPrivateIp(ip: string) {
  if (!net.isIP(ip)) return true;
  if (ip.includes(":")) {
    const normalized = ip.toLowerCase();
    return normalized === "::1" || normalized.startsWith("fc") ||
      normalized.startsWith("fd") || normalized.startsWith("fe80:");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export async function assertSafePublicUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP(S) URLs are supported.");
  if (blockedHosts.has(url.hostname.toLowerCase())) throw new Error("This host is not allowed.");
  const addresses = await dns.lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error("Private network URLs are not allowed.");
  }
  return url;
}

export async function safeFetch(rawUrl: string, signal: AbortSignal) {
  let url = await assertSafePublicUrl(rawUrl);
  for (let redirects = 0; redirects <= 4; redirects++) {
    const response = await fetch(url, {
      signal,
      redirect: "manual",
      headers: { 
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", 
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9"
      }
    });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("location");
    if (!location) throw new Error("Invalid redirect.");
    url = await assertSafePublicUrl(new URL(location, url).toString());
  }
  throw new Error("Too many redirects.");
}
