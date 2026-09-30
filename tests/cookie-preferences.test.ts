import assert from "node:assert/strict";
import { test } from "node:test";
import { COOKIE_PREFERENCES_MAX_AGE, createCookiePreferences, parseCookiePreferences } from "../lib/cookie-preferences";

const now = Date.parse("2026-09-30T02:00:00Z");
test("necessary-only acknowledgement expires at 180 days and cannot authorise optional tracking", () => {
  const record = createCookiePreferences(now);
  const raw = JSON.stringify(record);
  assert.equal(parseCookiePreferences(raw, now)?.choice, "necessary_only");
  assert.equal(parseCookiePreferences(raw, now + COOKIE_PREFERENCES_MAX_AGE - 1)?.choice, "necessary_only");
  assert.equal(parseCookiePreferences(raw, now + COOKIE_PREFERENCES_MAX_AGE), null);
  assert.equal(parseCookiePreferences(JSON.stringify({ ...record, choice: "accept_all" }), now), null);
});
test("corrupt and obsolete preferences do not dismiss a new notice", () => {
  for (const raw of [null, "", "{", "null", "true", "[]", JSON.stringify({ ...createCookiePreferences(now), version: 0 })]) {
    assert.equal(parseCookiePreferences(raw, now), null);
  }
});
test("future timestamps and altered retention are invalid", () => {
  const record = createCookiePreferences(now);
  assert.equal(parseCookiePreferences(JSON.stringify(createCookiePreferences(now + 1)), now), null);
  assert.equal(parseCookiePreferences(JSON.stringify({ ...record, expiresAt: "not-a-date" }), now), null);
  assert.equal(parseCookiePreferences(JSON.stringify({ ...record, expiresAt: new Date(now + COOKIE_PREFERENCES_MAX_AGE + 1).toISOString() }), now), null);
});
