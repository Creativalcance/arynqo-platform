export type SourceKind = "account" | "hashtag";
export type Source = {
  id: string;
  kind: SourceKind;
  value: string;
  enabled: boolean;
  last_checked_at: string | null;
  last_error: string | null;
};
export type Settings = {
  enabled: boolean;
  daily_requests: number;
  daily_generations: number;
  min_score: number;
  interval_minutes: number;
  max_age_hours: number;
  tone: string;
};
export type Opportunity = {
  id: string;
  source_id: string | null;
  media_id: string;
  permalink: string;
  caption: string;
  published_at: string | null;
  score: number;
  reason: string;
  status: "new" | "ready" | "dismissed" | "used" | "review";
  suggestions: string[];
  selected_comment: string;
  feedback: string;
  created_at: string;
};
export const defaults: Settings = {
  enabled: false,
  daily_requests: 120,
  daily_generations: 20,
  min_score: 40,
  interval_minutes: 60,
  max_age_hours: 48,
  tone: "Português europeu. Curto, bem-humorado e pertinente. A marca fala em nome próprio.",
};
export function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
export function sourceValue(kind: unknown, value: unknown): string | null {
  if ((kind !== "account" && kind !== "hashtag") || typeof value !== "string")
    return null;
  const clean = value.trim().replace(/^[@#]/, "").toLowerCase();
  return (kind === "account"
    ? /^[a-z0-9_][a-z0-9_.]{0,29}$/
    : /^[\p{L}\p{N}_]{1,80}$/u
  ).test(clean)
    ? clean
    : null;
}
export function settingsValue(value: unknown): Settings | null {
  if (
    !record(value) ||
    typeof value.enabled !== "boolean" ||
    typeof value.tone !== "string" ||
    !value.tone.trim() ||
    value.tone.length > 700
  )
    return null;
  const limits = {
    daily_requests: [6, 1000],
    daily_generations: [1, 200],
    min_score: [0, 100],
    interval_minutes: [15, 1440],
    max_age_hours: [1, 168],
  };
  for (const [key, [min, max]] of Object.entries(limits)) {
    if (
      !Number.isInteger(value[key]) ||
      Number(value[key]) < min ||
      Number(value[key]) > max
    )
      return null;
  }
  return {
    enabled: value.enabled,
    tone: value.tone.trim(),
    daily_requests: Number(value.daily_requests),
    daily_generations: Number(value.daily_generations),
    min_score: Number(value.min_score),
    interval_minutes: Number(value.interval_minutes),
    max_age_hours: Number(value.max_age_hours),
  };
}
export function instagramURL(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !["instagram.com", "www.instagram.com"].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.port ||
      !/^\/(p|reel)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)
    )
      return null;
    return `https://www.instagram.com${url.pathname.replace(/\/$/, "")}/`;
  } catch {
    return null;
  }
}
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function assess(caption: string): {
  score: number;
  reason: string;
  status: "new" | "review";
} {
  const text = fold(caption);
  if (
    /\b(morte|morreu|suicid|assedio|acidente|despediment|layoff|falencia|discrimin)/.test(
      text,
    )
  ) {
    return {
      score: 0,
      status: "review",
      reason:
        "Tema sensível: avaliar o contexto antes de preparar um comentário.",
    };
  }
  const groups = [
    {
      pattern:
        /\b(emprego|recrutamento|candidat|vaga|entrevista|job|hiring|recruit|career)/,
      label: "emprego e recrutamento",
    },
    {
      pattern:
        /\b(trabalh|horario|salario|teletrabalho|produtividade|work|salary|remote)/,
      label: "vida profissional",
    },
    {
      pattern:
        /\b(universidade|estagio|licenciatura|estudant|primeiro emprego|internship|graduate)/,
      label: "entrada no mercado de trabalho",
    },
  ];
  const matches = groups.filter((group) => group.pattern.test(text));
  return {
    score: matches.length ? Math.min(90, 45 + (matches.length - 1) * 20) : 0,
    status: "new",
    reason: matches.length
      ? `Triagem por legenda: ${matches.map((m) => m.label).join("; ")}. Não é uma previsão de alcance.`
      : "A legenda não contém uma ligação clara ao emprego ou à carreira.",
  };
}
export function validSuggestions(
  value: unknown,
  previous: string[],
): { suggestions: string[]; reason: string; relevant: boolean } | null {
  if (
    !record(value) ||
    typeof value.relevant !== "boolean" ||
    typeof value.reason !== "string" ||
    value.reason.length > 500 ||
    !Array.isArray(value.suggestions)
  )
    return null;
  if (!value.relevant)
    return { relevant: false, reason: value.reason, suggestions: [] };
  const suggestions = value.suggestions
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim());
  if (
    suggestions.length !== 3 ||
    suggestions.some(
      (item) =>
        item.length < 8 ||
        item.length > 240 ||
        /https?:|www\.|@arynqo|garantimos.{0,30}emprego|temos uma vaga/i.test(
          item,
        ),
    )
  )
    return null;
  const normalized = suggestions.map(fold);
  if (
    new Set(normalized).size !== 3 ||
    normalized.some((item) => previous.some((old) => fold(old.trim()) === item))
  )
    return null;
  return { suggestions, reason: value.reason, relevant: true };
}
