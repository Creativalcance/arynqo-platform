import assert from "node:assert/strict";
import { test } from "node:test";
import { analyticsPage, analyticsFrameDocument } from "../lib/google-analytics";

test("private paths and queries never qualify for analytics", () => {
  for (const path of ["/login", "/registo", "/auth/confirm", "/app", "/app/perfil", "/dashboard", "/empresa/candidatos/1", "/admin", "/vagas?q=email@example.com"]) assert.equal(analyticsPage(path), null);
  assert.equal(analyticsPage("/vagas/123"), "/vagas/detalhe");
  assert.equal(analyticsPage("/academia/exemplo"), "/academia/artigo");
});
test("measurement disables ads and sends only sanitised page metadata", () => {
  const html = analyticsFrameDocument(analyticsPage("/vagas/123")!);
  assert.ok(html.includes("G-14YLDZ820X"));
  assert.ok(html.includes("allow_google_signals:false"));
  assert.ok(html.includes("cookie_update:false"));
  assert.ok(html.includes("cookie_expires:15552000"));
  assert.ok(!html.includes("123"));
  assert.ok(html.includes("event.source !== window.parent"));
  assert.ok(html.includes("event.origin !== window.location.origin"));
});
