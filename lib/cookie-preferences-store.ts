"use client";

import { COOKIE_PREFERENCES_KEY, createCookiePreferences, parseCookiePreferences } from "./cookie-preferences";

export const SERVER_COOKIE_SNAPSHOT = "server";
const UPDATE_EVENT = "arynqo:cookie-preferences-updated";
let sessionPreference: string | null = null;

export function getCookiePreferencesSnapshot(): string | null {
  let raw: string | null;
  try { raw = sessionPreference ?? window.localStorage.getItem(COOKIE_PREFERENCES_KEY); }
  catch { raw = sessionPreference; }
  return parseCookiePreferences(raw) ? raw : null;
}

export function getServerCookiePreferencesSnapshot() {
  return SERVER_COOKIE_SNAPSHOT;
}

export function subscribeCookiePreferences(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === COOKIE_PREFERENCES_KEY || event.key === null) {
      sessionPreference = null;
      listener();
    }
  };
  const expiryTimer = window.setInterval(listener, 60_000);
  window.addEventListener("storage", onStorage);
  window.addEventListener(UPDATE_EVENT, listener);
  window.addEventListener("focus", listener);
  return () => {
    window.clearInterval(expiryTimer);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(UPDATE_EVENT, listener);
    window.removeEventListener("focus", listener);
  };
}

export function saveCookiePreference(analytics: boolean): boolean {
  const raw = JSON.stringify(createCookiePreferences(Date.now(), analytics));
  sessionPreference = raw;
  let persisted = false;
  try {
    window.localStorage.setItem(COOKIE_PREFERENCES_KEY, raw);
    persisted = window.localStorage.getItem(COOKIE_PREFERENCES_KEY) === raw;
  } catch { /* Keep the choice for this visit if storage is blocked. */ }
  window.dispatchEvent(new Event(UPDATE_EVENT));
  return persisted;
}
