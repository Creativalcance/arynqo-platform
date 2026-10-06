import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { decideApplication } from "../lib/application-decision";

function fixture(responses: Array<Response | Error>) {
  const requests: { url: string; method: string; body: unknown }[] = [];
  const client = createClient("https://example.supabase.co", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (url, options) => {
      requests.push({ url: String(url), method: options?.method || "GET", body: options?.body });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      if (!response) throw new Error("Unexpected request");
      return response;
    } },
  });
  return { client, requests };
}
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

test("decision only updates pending rows and does not request another notification", async () => {
  const { client, requests } = fixture([json([{ id: "a", status: "accepted" }])]);
  assert.equal(await decideApplication(client, "a", "accepted"), "accepted");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, "PATCH");
  assert.match(requests[0].url, /status=eq.pending/);
});
test("stale opposite decision reads the winner instead of reporting false failure", async () => {
  const { client, requests } = fixture([json([]), json({ id: "a", status: "accepted" })]);
  assert.equal(await decideApplication(client, "a", "rejected"), "accepted");
  assert.equal(requests.length, 2);
  assert.equal(requests[1].method, "GET");
});
test("lost update response recovers the persisted decision", async () => {
  const { client } = fixture([json({ message: "response lost" }, 400), json({ id: "a", status: "rejected" })]);
  assert.equal(await decideApplication(client, "a", "rejected"), "rejected");
});
test("pending or inaccessible application is never reported as decided", async () => {
  for (const data of [{ id: "a", status: "pending" }, null]) {
    const { client } = fixture([json([]), json(data)]);
    await assert.rejects(decideApplication(client, "a", "accepted"), /Não foi possível/);
  }
});
