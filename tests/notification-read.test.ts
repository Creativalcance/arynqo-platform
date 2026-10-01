import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { persistNotificationReads, notifyNotificationsChanged } from "../lib/notification-read";

function fixture(options: { noSession?: boolean; denied?: boolean; zeroRows?: boolean } = {}) {
  const rows = [{ id: "own", user_id: "user", is_read: false as boolean | null }, { id: "null", user_id: "user", is_read: null as boolean | null }, { id: "foreign", user_id: "other", is_read: false as boolean | null }];
  let owner = "";
  let ids: string[] = [];
  const query = {
    update(value: { is_read: boolean }) { assert.deepEqual(value, { is_read: true }); return query; },
    eq(column: string, value: string) { assert.equal(column, "user_id"); owner = value; return query; },
    in(column: string, values: string[]) { assert.equal(column, "id"); ids = values; return query; },
    async select(columns: string) {
      assert.equal(columns, "id, is_read");
      if (options.denied) return { data: null, error: new Error("Denied") };
      const selected = options.zeroRows ? [] : rows.filter(row => row.user_id === owner && ids.includes(row.id));
      for (const row of selected) row.is_read = true;
      return { data: selected.map(row => ({ ...row })), error: null };
    },
  };
  const client = {
    auth: { async getSession() { return { data: { session: options.noSession ? null : { user: { id: "user" } } }, error: null }; } },
    from(table: string) { assert.equal(table, "notifications"); return query; },
  } as unknown as SupabaseClient;
  return { client, rows };
}

test("reading persists only owned rows, supports null and remains read after a second request", async () => {
  const { client, rows } = fixture();
  assert.deepEqual(await persistNotificationReads(client, ["own", "null", "own"]), ["own", "null"]);
  assert.equal(rows[2].is_read, false);
  assert.deepEqual(await persistNotificationReads(client, ["own"]), ["own"]);
});
test("zero rows, foreign IDs, expired session and permission errors never report success", async () => {
  for (const options of [{ noSession: true }, { denied: true }, { zeroRows: true }]) {
    await assert.rejects(persistNotificationReads(fixture(options).client, ["own"]));
  }
  await assert.rejects(persistNotificationReads(fixture().client, ["foreign"]));
  await assert.rejects(persistNotificationReads(fixture().client, ["own", "foreign"]));
});
test("mark all only affects its snapshot; later notifications stay unread", async () => {
  const { client, rows } = fixture();
  const ids = rows.filter(row => row.user_id === "user" && !row.is_read).map(row => row.id);
  rows.push({ id: "later", user_id: "user", is_read: false });
  await persistNotificationReads(client, ids);
  assert.equal(rows.find(row => row.id === "later")?.is_read, false);
});
test("successful read signals current and other tabs; blocked storage still signals current tab", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  let events = 0;
  let writes = 0;
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    dispatchEvent(event: Event) { assert.equal(event.type, "arynqo-notifications-changed"); events++; },
    localStorage: { setItem(key: string) { assert.equal(key, "arynqo-notifications-changed"); writes++; throw new Error("Blocked"); } },
  } });
  try { notifyNotificationsChanged(); assert.equal(events, 1); assert.equal(writes, 1); }
  finally { if (previous) Object.defineProperty(globalThis, "window", previous); else Reflect.deleteProperty(globalThis, "window"); }
});
