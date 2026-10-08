import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
const admin = "10000000-0000-0000-0000-000000000001";
const candidate = "20000000-0000-0000-0000-000000000001";
const settings = {
  enabled: true,
  daily_requests: 12,
  daily_generations: 1,
  min_score: 40,
  interval_minutes: 15,
  max_age_hours: 48,
  tone: "Curto e pertinente.",
};
test("Radar SQL enforces access, leases, dedupe, pause, budgets, feedback and hashtag history", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create table public.profiles(id uuid primary key,role text); grant usage on schema public,auth to service_role; grant select on profiles to service_role; insert into auth.users values('${admin}'),('${candidate}'); insert into profiles values('${admin}','admin'),('${candidate}','student');`,
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261008221647_social_radar.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec("set role anon");
    await assert.rejects(
      db.query("select * from social_radar_sources"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select social_radar_claim('scan')"),
      /permission denied/,
    );
    await db.exec("reset role; set role authenticated");
    await assert.rejects(
      db.query("select * from social_radar_opportunities"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("update social_radar_settings set enabled=true"),
      /permission denied/,
    );
    await db.exec("reset role; set role service_role");
    const mutate = async (action, payload, actor = admin) =>
      (
        await db.query("select social_radar_mutate($1,$2,$3) as result", [
          actor,
          action,
          JSON.stringify(payload),
        ])
      ).rows[0].result;
    const claim = async (kind, id = null) =>
      (await db.query("select social_radar_claim($1,$2) as result", [kind, id]))
        .rows[0].result;
    const finish = async (run, rows = [], errors = {}, draft = null) =>
      (
        await db.query(
          "select social_radar_finish($1,$2,$3,$4,100) as result",
          [
            run,
            JSON.stringify(rows),
            JSON.stringify(errors),
            draft ? JSON.stringify(draft) : null,
          ],
        )
      ).rows[0].result;
    assert.equal((await claim("scan")).skipped, "paused");
    await assert.rejects(
      mutate("settings", settings, candidate),
      /Administrator required/,
    );
    await mutate("settings", settings);
    const source = (
      await mutate("source", { kind: "account", value: "jornaldenoticias" })
    ).id;
    const run = await claim("scan");
    assert.ok(run.id);
    assert.equal((await claim("scan")).skipped, "busy");
    assert.equal((await claim("draft")).skipped, "busy");
    const row = {
      source_id: source,
      media_id: "12345",
      permalink: "https://www.instagram.com/p/abc/",
      caption: "Trabalho e horários flexíveis.",
      published_at: new Date().toISOString(),
      score: 65,
      reason: "Horários",
      status: "new",
    };
    assert.equal((await finish(run.id, [row, row])).imported, 1);
    await assert.rejects(finish(run.id, [row]), /Stale run/);
    const opportunity = (
      await db.query("select id from social_radar_opportunities")
    ).rows[0].id;
    const draftRun = await claim("draft", opportunity);
    const result = {
      relevant: true,
      reason: "Ligação pertinente",
      suggestions: [
        "Uma nova oportunidade.",
        "Outro horário possível.",
        "Uma terceira hipótese.",
      ],
    };
    assert.equal((await finish(draftRun.id, [], {}, result)).imported, 1);
    assert.equal(
      (await claim("draft", opportunity)).skipped,
      "generation_budget",
    );
    await mutate("opportunity", {
      id: opportunity,
      status: "used",
      selected_comment: "Comentário publicado manualmente.",
      feedback: "Bom tom.",
    });
    assert.equal(
      (await db.query("select status from social_radar_opportunities")).rows[0]
        .status,
      "used",
    );
    await db.exec(
      "update social_radar_sources set last_checked_at=now()-interval '1 day'",
    );
    const paused = await claim("scan");
    await mutate("settings", { ...settings, enabled: false });
    assert.equal(
      (
        await finish(paused.id, [
          {
            ...row,
            media_id: "54321",
            permalink: "https://www.instagram.com/p/other/",
          },
        ])
      ).cancelled,
      true,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int as n from social_radar_opportunities",
        )
      ).rows[0].n,
      1,
    );
    await mutate("settings", settings);
    await db.exec("update social_radar_usage set requests=12");
    assert.equal((await claim("scan")).skipped, "request_budget");
    await db.exec("update social_radar_usage set requests=0");
    await mutate("toggle_source", { id: source, enabled: false });
    await db.exec(
      "insert into social_radar_hashtags select 'tag'||n,now() from generate_series(1,30) n",
    );
    const hash = (await mutate("source", { kind: "hashtag", value: "newtag" }))
      .id;
    assert.equal((await claim("scan")).skipped, "not_due");
    assert.equal(
      (
        await db.query(
          "select last_error from social_radar_sources where id=$1",
          [hash],
        )
      ).rows[0].last_error,
      "hashtag_budget",
    );
    await db.exec(
      "update social_radar_hashtags set last_searched_at=now()-interval '8 days'; update social_radar_sources set last_checked_at=null",
    );
    const next = await claim("scan");
    assert.equal(next.sources[0].value, "newtag");
    await finish(next.id);
    assert.ok(
      (await db.query("select count(*)::int as n from social_radar_audit"))
        .rows[0].n >= 7,
    );
  } finally {
    await db.close();
  }
});
