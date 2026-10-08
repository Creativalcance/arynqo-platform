import {
  assess,
  instagramURL,
  record,
  sourceValue,
  type Source,
} from "./domain";
export type MediaRow = {
  source_id: string;
  media_id: string;
  permalink: string;
  caption: string;
  published_at: string | null;
  score: number;
  reason: string;
  status: "new" | "review";
};
export class MetaError extends Error {
  constructor(
    public code:
      | "credentials"
      | "permission"
      | "rate_limit"
      | "provider"
      | "invalid_response"
      | "timeout",
  ) {
    super(code);
  }
}
export function metaConfig() {
  const token = process.env.SOCIAL_META_ACCESS_TOKEN;
  const user = process.env.SOCIAL_INSTAGRAM_USER_ID;
  const version = process.env.SOCIAL_META_API_VERSION;
  return token &&
    user &&
    /^\d+$/.test(user) &&
    version &&
    /^v\d+\.0$/.test(version)
    ? { token, user, version }
    : null;
}
async function graph(
  path: string,
  params: Record<string, string>,
  fetcher: typeof fetch,
): Promise<Record<string, unknown>> {
  const config = metaConfig();
  if (!config) throw new MetaError("credentials");
  const url = new URL(`https://graph.facebook.com/${config.version}/${path}`);
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );
  let response: Response;
  try {
    response = await fetcher(url, {
      headers: { Authorization: `Bearer ${config.token}` },
      redirect: "error",
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
  } catch {
    throw new MetaError("timeout");
  }
  if (!response.body) throw new MetaError("invalid_response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 500000) throw new MetaError("invalid_response");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  let data: unknown;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new MetaError("invalid_response");
  }
  if (!record(data)) throw new MetaError("invalid_response");
  if (!response.ok || data.error) {
    const code = record(data.error) ? data.error.code : null;
    throw new MetaError(
      response.status === 429 || [4, 17, 32, 613].includes(Number(code))
        ? "rate_limit"
        : code === 190
          ? "credentials"
          : [10, 200].includes(Number(code)) || response.status === 403
            ? "permission"
            : "provider",
    );
  }
  return data;
}
// Bounded to two read-only Graph requests per source. Never follow provider pagination URLs.
export async function discover(
  source: Source,
  maxAgeHours: number,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<MediaRow[]> {
  const config = metaConfig();
  if (!config || !sourceValue(source.kind, source.value))
    throw new MetaError("credentials");
  let collection: unknown;
  if (source.kind === "account") {
    const response = await graph(
      config.user,
      {
        fields: `business_discovery.username(${source.value}){media.limit(50){id,caption,permalink,timestamp}}`,
      },
      fetcher,
    );
    collection =
      record(response.business_discovery) &&
      record(response.business_discovery.media)
        ? response.business_discovery.media.data
        : null;
  } else {
    const search = await graph(
      "ig_hashtag_search",
      { user_id: config.user, q: source.value },
      fetcher,
    );
    const first = Array.isArray(search.data) ? search.data[0] : null;
    if (
      !record(first) ||
      typeof first.id !== "string" ||
      !/^\d+$/.test(first.id)
    )
      throw new MetaError("invalid_response");
    collection = (
      await graph(
        `${first.id}/recent_media`,
        { user_id: config.user, fields: "id,caption,permalink", limit: "50" },
        fetcher,
      )
    ).data;
  }
  if (!Array.isArray(collection)) throw new MetaError("invalid_response");
  const rows: MediaRow[] = [];
  for (const item of collection.slice(0, 50)) {
    if (
      !record(item) ||
      typeof item.id !== "string" ||
      !/^\d{1,80}$/.test(item.id) ||
      typeof item.caption !== "string"
    )
      continue;
    const permalink = instagramURL(item.permalink);
    const time =
      typeof item.timestamp === "string" ? Date.parse(item.timestamp) : null;
    if (!permalink || item.caption.trim().length < 15) continue;
    if (
      time === null
        ? source.kind !== "hashtag"
        : !Number.isFinite(time) ||
          time > now + 300000 ||
          time < now - maxAgeHours * 3600000
    )
      continue;
    const caption = item.caption.slice(0, 4000);
    rows.push({
      source_id: source.id,
      media_id: item.id,
      permalink,
      caption,
      published_at: time === null ? null : new Date(time).toISOString(),
      ...assess(caption),
    });
  }
  return rows;
}
