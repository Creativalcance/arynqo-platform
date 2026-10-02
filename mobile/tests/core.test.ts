import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import {
  acceptsApplications,
  searchTerm,
  applicationError,
} from "../src/lib/jobs";
import { createSecureStorage } from "../src/lib/secure-storage";
import { sendApplication } from "../src/lib/application";

test("search preserves international locations without accepting PostgREST expressions", () => {
  assert.equal(searchTerm("  São João  "), "São João");
  assert.equal(searchTerm("東京"), "東京");
  assert.doesNotMatch(
    searchTerm("%,is_active.eq.false,(title.like.*)"),
    /[%*,().]/,
  );
  assert.equal(searchTerm("a".repeat(500)).length, 100);
});
test("vacancy availability follows the server renewal deadline, including exact expiry", () => {
  const deadline = "2026-10-02T12:00:00.000Z";
  assert.equal(
    acceptsApplications({ is_active: true, renewal_deadline: null }),
    true,
  );
  assert.equal(
    acceptsApplications({ is_active: false, renewal_deadline: null }),
    false,
  );
  assert.equal(
    acceptsApplications(
      { is_active: true, renewal_deadline: deadline },
      Date.parse(deadline),
    ),
    false,
  );
  assert.equal(
    acceptsApplications(
      { is_active: true, renewal_deadline: deadline },
      Date.parse(deadline) - 1,
    ),
    true,
  );
});
test("secure session storage handles long Unicode values, replacement and logout", async () => {
  const values = new Map<string, string>();
  const storage = createSecureStorage({
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      assert.ok(Buffer.byteLength(value) <= 2048);
      values.set(key, value);
    },
    removeItem: async (key) => {
      values.delete(key);
    },
  });
  const session = JSON.stringify({
    token: "jwt".repeat(2000),
    name: "Fausto 😀".repeat(800),
  });
  await storage.setItem("auth-session", session);
  assert.equal(await storage.getItem("auth-session"), session);
  await storage.setItem("auth-session", "new-session");
  assert.equal(values.size, 2);
  assert.equal(await storage.getItem("auth-session"), "new-session");
  await storage.removeItem("auth-session");
  assert.equal(values.size, 0);
  assert.equal(await storage.getItem("auth-session"), null);
});
test("failed keychain writes preserve the previous complete session", async () => {
  const values = new Map<string, string>();
  let fail = false;
  const storage = createSecureStorage({
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      if (fail && key.endsWith(".1")) throw new Error("Keychain full");
      values.set(key, value);
    },
    removeItem: async (key) => {
      values.delete(key);
    },
  });
  await storage.setItem("auth-session", "valid-session");
  fail = true;
  await assert.rejects(
    storage.setItem("auth-session", "x".repeat(2000)),
    /Keychain full/,
  );
  assert.equal(await storage.getItem("auth-session"), "valid-session");
  assert.equal(values.size, 2);
});
test("application request sends only candidate and vacancy identifiers; preserves duplicate status", async () => {
  const client = createClient("https://unit-test.invalid", "test-public-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (_url, init) => {
        assert.equal(init?.method, "POST");
        assert.deepEqual(JSON.parse(init?.body as string), {
          job_id: "job-test",
          student_id: "candidate-test",
        });
        return new Response(
          JSON.stringify({ code: "23505", message: "Duplicate" }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  });
  const { error } = await sendApplication(client, "job-test", "candidate-test");
  assert.equal(error?.code, "23505");
  assert.match(applicationError(error?.code), /Já enviaste/);
});
