"use client";

import { COOKIE_PREFERENCES_KEY, createCookiePreferences, parseCookiePreferences } from "./cookie-preferences";

export const SERVER_COOKIE_SNAPSHOT = "server";
const UPDATE_EVENT = "arynqo:cookie-preferences-updated";
let sessionPreference: string | null = null;

export function getCookiePreferencesSnapshot(): string | null {
  let raw: string | null;
  try { raw = window.localStorage.getItem(COOKIE_PREFERENCES_KEY) ?? sessionPreference; }
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
  window.addEventListener("storage", onStorage);
  window.addEventListener(UPDATE_EVENT, listener);
  window.addEventListener("focus", listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(UPDATE_EVENT, listener);
    window.removeEventListener("focus", listener);
  };
}

export function saveNecessaryStoragePreference(): boolean {
  const raw = JSON.stringify(createCookiePreferences());
  sessionPreference = raw;
  let persisted = false;
  try {
    window.localStorage.setItem(COOKIE_PREFERENCES_KEY, raw);
    persisted = window.localStorage.getItem(COOKIE_PREFERENCES_KEY) === raw;
  } catch { /* Keep the acknowledgement for this visit if storage is blocked. */ }
  window.dispatchEvent(new Event(UPDATE_EVENT));
  return persisted;
}
