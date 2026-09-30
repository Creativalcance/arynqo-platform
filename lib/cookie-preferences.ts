export const COOKIE_PREFERENCES_KEY = "arynqo_cookie_preferences";
export const COOKIE_PREFERENCES_VERSION = 1;
export const COOKIE_PREFERENCES_MAX_AGE = 180 * 24 * 60 * 60 * 1000;

export type CookiePreferences = {
  version: number;
  choice: "necessary_only";
  savedAt: string;
  expiresAt: string;
};

// This records acknowledgement of necessary storage, not consent to tracking.
// Adding optional technologies requires their actual blocking logic and a new version.
export function createCookiePreferences(now = Date.now()): CookiePreferences {
  return {
    version: COOKIE_PREFERENCES_VERSION,
    choice: "necessary_only",
    savedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + COOKIE_PREFERENCES_MAX_AGE).toISOString(),
  };
}

export function parseCookiePreferences(raw: string | null, now = Date.now()): CookiePreferences | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || value.version !== COOKIE_PREFERENCES_VERSION || value.choice !== "necessary_only" ||
        typeof value.savedAt !== "string" || typeof value.expiresAt !== "string") return null;
    const savedAt = Date.parse(value.savedAt), expiresAt = Date.parse(value.expiresAt);
    if (!Number.isFinite(savedAt) || !Number.isFinite(expiresAt) || savedAt > now ||
        expiresAt <= now || expiresAt - savedAt !== COOKIE_PREFERENCES_MAX_AGE) return null;
    return value;
  } catch { return null; }
}
