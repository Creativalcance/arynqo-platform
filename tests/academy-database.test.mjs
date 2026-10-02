import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("automation claims are exclusive, publication atomic, budget bounded and private tables protected", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
   grant usage on schema public to anon,authenticated,service_role;
   create schema auth; create function auth.uid() returns uuid language sql as 'select nullif(current_setting(''request.test_user'',true),'''')::uuid'; grant usage on schema auth to authenticated;
   create table profiles(id uuid primary key,role text); grant select on profiles to authenticated;
   create table academy_posts(id uuid primary key default gen_random_uuid(),title text,slug text unique,excerpt text,content text,category text,audience text,reading_time text,status text,source_type text,trend_topic text,seo_title text,seo_description text,published_at timestamptz,updated_at timestamptz default now());
   alter table academy_posts enable row level security; create policy published on academy_posts for select to anon,authenticated using(status='published');
   grant select on academy_posts to anon,authenticated; grant all on academy_posts to service_role;`);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261001233305_academy_multilingual_automation.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec("set role anon");
    await assert.rejects(
      db.query("select academy_claim_run()"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select * from academy_generation_runs"),
      /permission denied/,
    );
    assert.equal(
      (await db.query("select * from academy_post_translations")).rows.length,
      0,
    );
    await db.exec("reset role; set role authenticated;");
    assert.equal(
      (await db.query("select * from academy_automation_settings")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("update academy_automation_settings set enabled=true"),
      /permission denied/,
    );
    await db.exec("reset role; set role service_role;");
    const paused = (await db.query("select academy_claim_run() as claim"))
      .rows[0].claim;
    assert.equal(paused.reason, "paused");
    await db.exec(
      "update academy_automation_settings set enabled=true,auto_publish=true,monthly_request_limit=6",
    );
    const r = (await db.query("select academy_claim_run() as claim")).rows[0]
      .claim;
    assert.equal(r.status, "running");
    assert.equal(
      (await db.query("select academy_claim_run() as claim")).rows[0].claim
        .reason,
      "already_running",
    );
    const payload = {
      locale: "pt",
      title: "Article",
      slug: "article",
      excerpt: "excerpt",
      content: "useful ".repeat(650),
      category: "Carreira",
      audience: "Todos",
      seo_title: "Article",
      seo_description: "Description",
      reading_time: "5 min",
      review_required: false,
    };
    for (const locale of ["pt", "en", "fr", "es", "de"])
      await db.query("select academy_stage_translation($1,$2,$3,$4::jsonb)", [
        r.id,
        r.lease_token,
        locale,
        JSON.stringify({ ...payload, locale }),
      ]);
    await assert.rejects(
      db.query("select academy_finish_run($1,$2)", [r.id, r.lease_token]),
      /six_versions_required/,
    );
    await db.exec("reset role; set role anon;");
    assert.equal(
      (await db.query("select * from academy_posts")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from academy_post_translations")).rows.length,
      0,
    );
    await db.exec("reset role; set role service_role;");
    await db.query("select academy_stage_translation($1,$2,$3,$4::jsonb)", [
      r.id,
      r.lease_token,
      "it",
      JSON.stringify({ ...payload, locale: "it" }),
    ]);
    const completed = (
      await db.query("select academy_finish_run($1,$2) as result", [
        r.id,
        r.lease_token,
      ])
    ).rows[0].result;
    assert.equal(completed.status, "published");
    await assert.rejects(
      db.query("select academy_stage_translation($1,$2,$3,$4::jsonb)", [
        r.id,
        r.lease_token,
        "pt",
        JSON.stringify(payload),
      ]),
      /lease_lost/,
    );
    assert.equal(
      (await db.query("select academy_claim_run() as claim")).rows[0].claim
        .reason,
      "not_due",
    );
    await db.exec("update academy_automation_settings set next_due_at=now();");
    assert.equal(
      (await db.query("select academy_claim_run() as claim")).rows[0].claim
        .reason,
      "monthly_limit",
    );
    await db.exec("reset role; set role anon;");
    assert.equal(
      (await db.query("select * from academy_post_translations")).rows.length,
      6,
    );
    await db.exec(
      "reset role; set role service_role; update academy_automation_settings set monthly_request_limit=30;",
    );
    const second = (
      await db.query("select academy_claim_run(null,true) as claim")
    ).rows[0].claim;
    assert.notEqual(second.topic_id, r.topic_id);
    await db.query("select academy_stage_translation($1,$2,$3,$4::jsonb)", [
      second.id,
      second.lease_token,
      "pt",
      JSON.stringify({ ...payload, slug: "second-article" }),
    ]);
    await db.query("select academy_fail_run($1,$2,$3)", [
      second.id,
      second.lease_token,
      "source_unavailable",
    ]);
    const retry = (
      await db.query("select academy_claim_run($1) as claim", [second.id])
    ).rows[0].claim;
    assert.equal(retry.id, second.id);
    assert.equal(retry.attempts, 2);
    assert.equal(retry.preview_only, true);
    assert.ok(retry.post_id);
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from academy_post_translations where post_id=$1",
          [retry.post_id],
        )
      ).rows[0].n,
      1,
    );
    for (const locale of ["pt", "en", "fr", "es", "de", "it"])
      await db.query("select academy_stage_translation($1,$2,$3,$4::jsonb)", [
        retry.id,
        retry.lease_token,
        locale,
        JSON.stringify({ ...payload, slug: "second-article", locale }),
      ]);
    assert.equal(
      (
        await db.query("select academy_finish_run($1,$2) as result", [
          retry.id,
          retry.lease_token,
        ])
      ).rows[0].result.status,
      "review",
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from academy_posts where status='published'",
        )
      ).rows[0].n,
      1,
    );
    await db.query("select academy_edit_translation($1,$2,$3::jsonb)", [
      retry.post_id,
      "en",
      JSON.stringify({ ...payload, title: "Reviewed English version" }),
    ]);
    await db.query("select academy_publish_reviewed($1)", [retry.post_id]);
    assert.equal(
      (
        await db.query(
          "select status from academy_generation_runs where id=$1",
          [retry.id],
        )
      ).rows[0].status,
      "published",
    );
    await assert.rejects(
      db.query("select academy_publish_reviewed($1)", [retry.post_id]),
      /article_not_reviewable/,
    );
    await db.exec("reset role; set role anon;");
    assert.equal(
      (
        await db.query(
          "select title from academy_post_translations where post_id=$1 and locale='en'",
          [retry.post_id],
        )
      ).rows[0].title,
      "Reviewed English version",
    );
  } finally {
    await db.close();
  }
});


test("Academy quota operation is accepted and remains bounded and service-only", async () => {
 const db=new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema private;
   create table private.api_limits(user_id uuid,operation text,window_start timestamptz,request_count integer,primary key(user_id,operation));
   grant usage on schema private to service_role; grant all on private.api_limits to service_role;`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261002001331_academy_api_limit_operation.sql',import.meta.url),'utf8'));
  await db.exec('set role authenticated');
  await assert.rejects(db.query("select consume_api_limit('10000000-0000-0000-0000-000000000001','academy_admin',2,900)"),/permission denied/);
  await db.exec('reset role; set role service_role;');
  for(let i=0;i<2;i++) await db.query("select consume_api_limit('10000000-0000-0000-0000-000000000001','academy_admin',2,900)");
  await assert.rejects(db.query("select consume_api_limit('10000000-0000-0000-0000-000000000001','academy_admin',2,900)"),/API request limit reached/);
 }finally{await db.close();}
});
