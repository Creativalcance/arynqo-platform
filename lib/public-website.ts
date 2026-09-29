import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(address, prefix, "ipv4");
blocked.addSubnet("2001:db8::", 32, "ipv6");
blocked.addSubnet("2001::", 32, "ipv6");
blocked.addSubnet("2002::", 16, "ipv6");

export function isPublicAddress(address: string) {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  // Only global unicast; reject mapped IPv4, loopback, link-local and ULA too.
  if (family === 6) return /^[23]/.test(address) && !blocked.check(address, "ipv6");
  return false;
}

export function publicWebsiteUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      (url.port && !["80", "443"].includes(url.port))) {
    throw new Error("Endereço de website inválido.");
  }
  return url;
}

export async function fetchPublicWebsite(value: string, redirects = 0): Promise<string> {
  const url = publicWebsiteUrl(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("O website deve ter um endereço público.");
  }
  const pinned = addresses[0];
  const response = await new Promise<{ text?: string; location?: string }>((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
      headers: { "User-Agent": "ARYNQO/1.0", Accept: "text/html" },
      // Pin the validated address so a second DNS resolution cannot target a private host.
      lookup: (_host, options, callback) => {
        if (options.all) callback(null, [pinned]);
        else callback(null, pinned.address, pinned.family);
      },
    }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode || 0)) {
        res.resume();
        resolve({ location: res.headers.location });
        return;
      }
      if (res.statusCode !== 200 || !res.headers["content-type"]?.includes("text/html")) {
        res.resume();
        reject(new Error("O website não devolveu uma página HTML."));
        return;
      }
      let size = 0;
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > 1024 * 1024) request.destroy(new Error("Página demasiado grande."));
        else chunks.push(chunk);
      });
      res.on("error", reject);
      res.on("end", () => resolve({ text: Buffer.concat(chunks).toString("utf8") }));
    });
    const timer = setTimeout(() => request.destroy(new Error("Tempo de acesso ao website excedido.")), 10_000);
    request.on("close", () => clearTimeout(timer));
    request.on("error", reject);
    request.end();
  });
  if (response.location) {
    if (redirects >= 3) throw new Error("Demasiados redirecionamentos.");
    return fetchPublicWebsite(new URL(response.location, url).href, redirects + 1);
  }
  if (response.text === undefined) throw new Error("Redirecionamento inválido.");
  return response.text;
}
