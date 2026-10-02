import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TopicCalendar from "../app/admin/academia/components/TopicCalendar";

test("calendar renders unused topics with null one-to-one relations and hides used topics", () => {
  const html = renderToStaticMarkup(createElement(TopicCalendar, { topics: [
    { id: "unused", title: "Upcoming topic", academy_generation_runs: null },
    { id: "used", title: "Already generated", academy_generation_runs: { id: "run-1" } },
  ] }));
  assert.match(html, /Upcoming topic/);
  assert.doesNotMatch(html, /Already generated/);
  assert.equal((html.match(/<li/g) || []).length, 1);
});

test("calendar handles empty calendars and legacy array-shaped relations", () => {
  assert.doesNotThrow(() => renderToStaticMarkup(createElement(TopicCalendar, { topics: [] })));
  const html = renderToStaticMarkup(createElement(TopicCalendar, { topics: [
    { id: "unused", title: "Upcoming legacy topic", academy_generation_runs: [] },
    { id: "used", title: "Used legacy topic", academy_generation_runs: [{ id: "run-1" }] },
  ] }));
  assert.match(html, /Upcoming legacy topic/);
  assert.doesNotMatch(html, /Used legacy topic/);
});
