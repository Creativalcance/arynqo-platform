import { plainSource, safeSourceURL } from "./quality";

type Source = { url: string; text: string; checked_at: string };
export async function fetchSource(url: string): Promise<Source> {
  if (!safeSourceURL(url)) throw new Error("invalid_source");
  // One retry for transient HTTP failures; redirects stay on the approved hosts.
  const signal = AbortSignal.timeout(24000);
  let current = url;
  let response: Response | undefined;
  let retried = false;
  let redirects = 0;
  while (true) {
    try {
      response = await fetch(current, {
        redirect: "manual", cache: "no-store", signal,
        headers: { Accept: "text/html" },
      });
    } catch {
      throw new Error("source_unavailable");
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location || ++redirects > 3) throw new Error("source_unavailable");
      const target = new URL(location, current).href;
      if (!safeSourceURL(target)) throw new Error("invalid_source");
      current = target;
      continue;
    }
    if ([502, 503, 504].includes(response.status) && !retried) {
      await response.body?.cancel();
      retried = true;
      continue;
    }
    break;
  }
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("text/html") ||
    !response.body
  )
    throw new Error("source_unavailable");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 750000) throw new Error("source_too_large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const text = plainSource(new TextDecoder().decode(Buffer.concat(chunks)));
  if (text.length < 500) throw new Error("source_empty");
  return { url: current, text, checked_at: new Date().toISOString() };
}
