export const locales = ["pt", "en", "fr", "es", "de", "it"] as const;
export type Locale = typeof locales[number];
export const localeNames: Record<Locale, string> = { pt: "Português", en: "English", fr: "Français", es: "Español", de: "Deutsch", it: "Italiano" };
export const languageTags: Record<Locale, string> = { pt: "pt-PT", en: "en", fr: "fr", es: "es", de: "de", it: "it" };
export const localeCookie = "arynqo_locale";
export function isLocale(value: unknown): value is Locale { return typeof value === "string" && locales.includes(value as Locale); }
export function normalizeLocale(value: unknown): Locale { return isLocale(value) ? value : "pt"; }
export function pathLocale(path: string): Locale | null { const part = path.split(/[/?#]/)[1]; return isLocale(part) ? part : null; }
export function stripLocale(path: string): string { return pathLocale(path) ? path.replace(/^\/(pt|en|fr|es|de|it)(?=\/|\?|#|$)/, "") || "/" : path; }
export function localizedPath(path: string, locale: Locale): string {
  if (!path.startsWith("/") || path.startsWith("//") || /^\/(api|_next)(\/|$)/.test(path) || /\.[a-z0-9]+($|[?#])/i.test(path)) return path;
  const clean = stripLocale(path);
  return locale === "pt" ? clean : `/${locale}${clean === "/" ? "" : clean.startsWith("?") || clean.startsWith("#") ? "/" + clean : clean}`;
}
export function browserLocale(): Locale {
  if (typeof window === "undefined") return "pt";
  return pathLocale(window.location.pathname) || normalizeLocale(document.cookie.match(/(?:^|; )arynqo_locale=([^;]+)/)?.[1]);
}
export function browserLocalizedPath(path: string) { return localizedPath(path, browserLocale()); }
export function localeAlternates(path: string) {
  return Object.fromEntries([...locales.map(locale => [languageTags[locale], `https://www.arynqo.com${localizedPath(path, locale)}`]), ["x-default", `https://www.arynqo.com${localizedPath(path, "pt")}`]]);
}
