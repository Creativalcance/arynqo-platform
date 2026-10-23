import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchSource, fetchSources } from '../lib/academy/sources';
const url = 'https://europass.europa.eu/en/learn-europe/plan-your-learning';
const html = () => new Response('<p>' + 'Useful learning guidance. '.repeat(80) + '</p>', { headers: { 'content-type': 'text/html' } });
test('transient source failure retries once', async t => {
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>++calls===1?new Response('',{status:503}):html());
 assert.ok((await fetchSource(url)).text.length>500);
 assert.equal(calls,2);
});
test('approved relative redirect is followed and recorded', async t => {
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>++calls===1?new Response(null,{status:301,headers:{location:'/en/learning'}}):html());
 assert.equal((await fetchSource(url)).url,'https://europass.europa.eu/en/learning');
});
test('unapproved redirect is rejected before contacting its target', async t => {
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://127.0.0.1/private'}})});
 await assert.rejects(fetchSource(url),/invalid_source/);
 assert.equal(calls,1);
});
test('persistent failures stop after two reads; access denials are not retried', async t => {
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('',{status:503})});
 await assert.rejects(fetchSource(url),/source_unavailable/);
 assert.equal(calls,2);
 t.mock.restoreAll(); calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('',{status:403})});
 await assert.rejects(fetchSource(url),/source_unavailable/);
 assert.equal(calls,1);
});

test('a failed secondary source does not discard the verified primary source', async t => {
 t.mock.method(globalThis,'fetch',async(input: string | URL | Request)=>String(input)===url?html():new Response('',{status:403}));
 const sources = await fetchSources([url, 'https://www.ilo.org/topics-and-sectors/skills-and-lifelong-learning']);
 assert.equal(sources.length,1);
 assert.equal(sources[0].url,url);
 assert.ok(sources[0].text.length>500);
});
test('no generation without at least one verified source', async t => {
 t.mock.method(globalThis,'fetch',async()=>new Response('',{status:503}));
 await assert.rejects(fetchSources([url]),/source_unavailable/);
 await assert.rejects(fetchSources([]),/invalid_source/);
});
test('a valid source does not mask an unsafe secondary source', async t => {
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return html()});
 await assert.rejects(fetchSources([url,'http://localhost/private']),/invalid_source/);
 assert.equal(calls,0);
});

test('a transient network disconnect is retried once', async t => {
 let calls = 0;
 t.mock.method(globalThis, 'fetch', async () => {
  if (++calls === 1) throw new TypeError('fetch failed');
  return html();
 });
 assert.ok((await fetchSource(url)).text.length > 500);
 assert.equal(calls, 2);
});

test('persistent network errors stop after one retry', async t => {
 let calls = 0;
 t.mock.method(globalThis, 'fetch', async () => { calls++; throw new TypeError('fetch failed'); });
 await assert.rejects(fetchSource(url), /source_unavailable/);
 assert.equal(calls, 2);
});

test('an expired deadline is not retried', async t => {
 let calls = 0;
 t.mock.method(AbortSignal, 'timeout', () => AbortSignal.abort());
 t.mock.method(globalThis, 'fetch', async () => { calls++; throw new DOMException('timeout', 'TimeoutError'); });
 await assert.rejects(fetchSource(url), /source_unavailable/);
 assert.equal(calls, 1);
});

test('stream failures remain source failures and do not mask their reason during cleanup', async t => {
 t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({
  start(controller) { controller.error(new Error('connection terminated')); },
 }), { headers: { 'content-type': 'text/html' } }));
 await assert.rejects(fetchSource(url), /^Error: source_unavailable$/);
});

test('source size limits and rate limits remain enforced', async t => {
 let calls = 0;
 t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response(null, { status: 429 }); });
 await assert.rejects(fetchSource(url), /source_unavailable/);
 assert.equal(calls, 1);
 t.mock.restoreAll();
 t.mock.method(globalThis, 'fetch', async () => new Response('x'.repeat(750001), { headers: { 'content-type': 'text/html' } }));
 await assert.rejects(fetchSource(url), /source_too_large/);
});
